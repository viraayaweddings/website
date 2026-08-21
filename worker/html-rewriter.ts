/**
 * Provides `HTMLRewriter` on Node.
 *
 * The whole content pipeline — admin rich-text sanitising and every public-page
 * injection handler — is written against Cloudflare's streaming HTMLRewriter.
 * Vercel's Node runtime has no such global, so on Vercel `sanitiseRichText`
 * threw and `injectManagedContent` silently returned the page untouched.
 *
 * `html-rewriter-wasm` is the same lol-html engine Cloudflare runs, compiled to
 * WebAssembly, so the existing handlers keep their exact pass-through
 * behaviour: anything a handler does not touch comes back byte-for-byte.
 * Only the entry point differs — it is a write/end stream rather than
 * `transform(Response)` — so that is all this wraps.
 *
 * Importing this module installs the global. It is a no-op on Cloudflare.
 */
import { HTMLRewriter as WasmHTMLRewriter } from "html-rewriter-wasm";

type ElementHandlers = Parameters<WasmHTMLRewriter["on"]>[1];

class NodeHTMLRewriter {
  private readonly handlers: Array<[string, ElementHandlers]> = [];

  on(selector: string, handlers: ElementHandlers): this {
    this.handlers.push([selector, handlers]);
    return this;
  }

  transform(response: Response): Response {
    const handlers = this.handlers;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // The wasm callback hands back a view into memory that is reused for
        // the next chunk, so each one is copied before it is queued.
        const rewriter = new WasmHTMLRewriter((chunk) => {
          if (chunk.length > 0) controller.enqueue(new Uint8Array(chunk));
        });

        for (const [selector, elementHandlers] of handlers) {
          rewriter.on(selector, elementHandlers);
        }

        try {
          await rewriter.write(new Uint8Array(await response.arrayBuffer()));
          await rewriter.end();
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          rewriter.free();
        }
      },
    });

    // The body length changes, and a stale content-length truncates the page.
    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

if (typeof (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter === "undefined") {
  (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter = NodeHTMLRewriter;
}
