import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import test, { afterEach, mock } from "node:test";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Production's bundler resolves extensionless TS imports; use the same files in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_ACCESS_KEY_ID = "test-access";
process.env.R2_SECRET_ACCESS_KEY = "test-secret";
process.env.R2_BUCKET_NAME = "test-bucket";
process.env.VERCEL = "1";
const { serveMedia } = await import("../worker/site/media.ts");
const migrationMap = JSON.parse(await readFile(new URL("../scripts/image-migration-map.json", import.meta.url)));
const [publicPath, mediaPath] = Object.entries(migrationMap).find(([, value]) => value.startsWith("/media/"));
afterEach(() => mock.restoreAll());

test("repeated HEAD requests use metadata without acquiring unread image streams", async () => {
  let heads = 0;
  mock.method(S3Client.prototype, "send", async (command) => {
    assert.ok(command instanceof HeadObjectCommand, "HEAD must not download an S3 object body");
    heads++;
    return { ContentType: "image/jpeg", ContentLength: 12345, ETag: '"image-etag"' };
  });
  for (let i = 0; i < 75; i++) {
    const response = await serveMedia({}, "/media/test.jpg", "HEAD");
    assert.equal(response.status, 200);
    assert.equal(response.body, null);
    assert.equal(response.headers.get("content-length"), "12345");
    assert.equal(response.headers.get("etag"), '"image-etag"');
  }
  assert.equal(heads, 75);
});

test("GET still serves the actual image bytes", async () => {
  mock.method(S3Client.prototype, "send", async (command) => {
    assert.ok(command instanceof GetObjectCommand);
    return {
      ContentType: "image/png", ContentLength: 3,
      Body: { transformToWebStream: () => new Response(new Uint8Array([1, 2, 3])).body },
    };
  });
  const response = await serveMedia({}, "/media/test.png", "GET");
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
});

test("missing R2 metadata uses a HEAD request for the legacy fallback", async () => {
  mock.method(S3Client.prototype, "send", async () => { throw new Error("NoSuchKey"); });
  mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, publicPath);
    assert.equal(options.method, "HEAD");
    return new Response(null, { headers: { "content-type": "image/png", "content-length": "42" } });
  });
  const response = await serveMedia({}, mediaPath, "HEAD", `https://viraayaweddings.com${mediaPath}`);
  assert.equal(response.status, 200);
  assert.equal(response.body, null);
  assert.equal(response.headers.get("content-length"), "42");
});

test("a stalled R2 read is aborted and reaches the legacy fallback", async () => {
  mock.method(S3Client.prototype, "send", (_command, options) => new Promise((_resolve, reject) => {
    options.abortSignal.addEventListener("abort", () => reject(options.abortSignal.reason), { once: true });
  }));
  mock.method(globalThis, "fetch", async () => new Response(null, { headers: { "content-type": "image/png" } }));
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const response = await serveMedia({}, mediaPath, "HEAD", `https://viraayaweddings.com${mediaPath}`);
    assert.equal(response.status, 200);
  } finally { clearInterval(keepAlive); }
});
