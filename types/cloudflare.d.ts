/**
 * Minimal ambient types for the Cloudflare runtime surface this project uses.
 *
 * `@cloudflare/workers-types` is deliberately not installed: it redefines DOM
 * globals (Request, Response, fetch) and clashes with the "dom" lib this
 * project compiles against. Declaring only what we touch avoids that.
 */

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(columnName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
  dump(): Promise<ArrayBuffer>;
}

interface R2HttpMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
    options?: { httpMetadata?: R2HttpMetadata; customMetadata?: Record<string, string> },
  ): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

/** Bindings and secrets available to the worker and to server components. */
interface CloudflareEnv {
  ASSETS?: Fetcher;
  DB?: D1Database;
  MEDIA?: R2Bucket;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO?: string;
  RESEND_TO_EMAIL?: string;
  LEAD_EMAIL_TO?: string;
  LEAD_EMAIL_SUBJECT?: string;
  RESEND_ALLOW_INSECURE_LOCAL_TLS?: string;
}

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}

/** Vite raw imports, used to embed migration SQL in the worker bundle. */
declare module "*.sql?raw" {
  const content: string;
  export default content;
}

/** Streaming HTML transformer, used to inject managed content into static pages. */
interface HTMLRewriterElement {
  tagName: string;
  readonly attributes: IterableIterator<[string, string]>;
  readonly removed: boolean;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): HTMLRewriterElement;
  removeAttribute(name: string): HTMLRewriterElement;
  before(content: string, options?: { html?: boolean }): HTMLRewriterElement;
  after(content: string, options?: { html?: boolean }): HTMLRewriterElement;
  prepend(content: string, options?: { html?: boolean }): HTMLRewriterElement;
  append(content: string, options?: { html?: boolean }): HTMLRewriterElement;
  replace(content: string, options?: { html?: boolean }): HTMLRewriterElement;
  setInnerContent(content: string, options?: { html?: boolean }): HTMLRewriterElement;
  remove(): HTMLRewriterElement;
  removeAndKeepContent(): HTMLRewriterElement;
}

interface HTMLRewriterText {
  readonly text: string;
  readonly lastInTextNode: boolean;
  readonly removed: boolean;
  before(content: string, options?: { html?: boolean }): HTMLRewriterText;
  after(content: string, options?: { html?: boolean }): HTMLRewriterText;
  replace(content: string, options?: { html?: boolean }): HTMLRewriterText;
  remove(): HTMLRewriterText;
}

interface HTMLRewriterElementHandlers {
  element?(element: HTMLRewriterElement): void | Promise<void>;
  text?(text: HTMLRewriterText): void | Promise<void>;
}

declare class HTMLRewriter {
  constructor();
  on(selector: string, handlers: HTMLRewriterElementHandlers): HTMLRewriter;
  transform(response: Response): Response;
}
