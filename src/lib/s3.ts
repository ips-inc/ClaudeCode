import "server-only";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible media store. Works unchanged against Cloudflare R2, self-hosted
 * MinIO, or AWS S3 — the app only speaks the S3 API, so the backend is a config
 * choice (see .env). The bucket is PRIVATE; every client byte flows through a
 * short-lived presigned URL minted only after an authorization check.
 */

export const MEDIA_BUCKET = process.env.S3_BUCKET || "studio-media";

let _client: S3Client | null = null;

export function s3(): S3Client {
  if (_client) return _client;
  const endpoint = process.env.S3_ENDPOINT || undefined;
  _client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint,
    // R2/MinIO require path-style addressing.
    forcePathStyle: !!endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  return _client;
}

const DEFAULT_TTL = 3600;

/** Presigned GET. Optionally forces an attachment download with a filename + content-type. */
export function presignGet(
  key: string,
  opts: { ttl?: number; download?: string | false; contentType?: string } = {}
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: key,
    ResponseContentDisposition:
      opts.download === false || opts.download === undefined
        ? undefined
        : `attachment; filename="${opts.download.replace(/["\\\r\n]/g, "_")}"`,
    ResponseContentType: opts.contentType,
  });
  return getSignedUrl(s3(), cmd, { expiresIn: opts.ttl ?? DEFAULT_TTL });
}

/** Presigned single-shot PUT (small files). Large files use multipart below. */
export function presignPut(
  key: string,
  contentType: string,
  ttl = DEFAULT_TTL
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3(), cmd, { expiresIn: ttl });
}

// ---- Resumable multipart upload (any size: 100GB+ camera masters) ----

export async function createMultipart(key: string, contentType: string): Promise<string> {
  const out = await s3().send(
    new CreateMultipartUploadCommand({ Bucket: MEDIA_BUCKET, Key: key, ContentType: contentType })
  );
  if (!out.UploadId) throw new Error("no UploadId returned");
  return out.UploadId;
}

/** Presign one part URL — the browser PUTs each chunk directly to storage. */
export function presignUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  ttl = DEFAULT_TTL
): Promise<string> {
  const cmd = new UploadPartCommand({
    Bucket: MEDIA_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(s3(), cmd, { expiresIn: ttl });
}

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
): Promise<void> {
  await s3().send(
    new CompleteMultipartUploadCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) },
    })
  );
}

export async function abortMultipart(key: string, uploadId: string): Promise<void> {
  await s3().send(
    new AbortMultipartUploadCommand({ Bucket: MEDIA_BUCKET, Key: key, UploadId: uploadId })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3().send(
      new DeleteObjectsCommand({
        Bucket: MEDIA_BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    );
  }
}
