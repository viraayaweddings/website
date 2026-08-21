/**
 * Cloudflare R2 access via the S3-compatible API (works from Vercel serverless).
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getR2Config, type R2Config } from "../env";

let client: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function getClient(): { client: S3Client; config: R2Config } | null {
  const config = getR2Config();
  if (!config) return null;

  if (!client || cachedConfig?.bucket !== config.bucket) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedConfig = config;
  }

  return { client, config };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export async function r2Head(key: string): Promise<{ contentType?: string; size?: number } | null> {
  const ctx = getClient();
  if (!ctx) return null;

  try {
    const result = await ctx.client.send(new HeadObjectCommand({ Bucket: ctx.config.bucket, Key: key }));
    return {
      contentType: result.ContentType,
      size: result.ContentLength,
    };
  } catch {
    return null;
  }
}

export async function r2Put(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<boolean> {
  const ctx = getClient();
  if (!ctx) return false;

  await ctx.client.send(
    new PutObjectCommand({
      Bucket: ctx.config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return true;
}

export async function r2Get(key: string): Promise<{
  body: ReadableStream<Uint8Array> | null;
  contentType: string;
  size: number;
  etag?: string;
} | null> {
  const ctx = getClient();
  if (!ctx) return null;

  try {
    const result = await ctx.client.send(new GetObjectCommand({ Bucket: ctx.config.bucket, Key: key }));
    if (!result.Body) return null;

    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType || "application/octet-stream",
      size: result.ContentLength || 0,
      etag: result.ETag,
    };
  } catch {
    return null;
  }
}

export async function r2Delete(key: string): Promise<void> {
  const ctx = getClient();
  if (!ctx) return;

  await ctx.client.send(new DeleteObjectCommand({ Bucket: ctx.config.bucket, Key: key }));
}
