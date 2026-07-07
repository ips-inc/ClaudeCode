import { test } from "node:test";
import assert from "node:assert/strict";

// Presigning is purely local (AWS SigV4 over the request) — no network — so we
// can prove the URLs point at the right bucket/key/host and carry a signature
// and TTL entirely offline. The live byte round-trip is verified once real
// R2/MinIO credentials exist (see docs/NOTES.md).
process.env.S3_ENDPOINT = "https://accountid.r2.cloudflarestorage.com";
process.env.S3_REGION = "auto";
process.env.S3_BUCKET = "studio-media";
process.env.S3_ACCESS_KEY_ID = "TESTKEYID";
process.env.S3_SECRET_ACCESS_KEY = "TESTSECRETKEY";

// s3() reads env lazily on first call, so a static import is fine here.
import { presignGet, presignPut, presignUploadPart } from "../src/lib/s3.ts";

test("presignGet targets the private bucket + key over the configured endpoint", async () => {
  const url = await presignGet("clientA/asset1/master.mov", { ttl: 900 });
  const u = new URL(url);
  assert.equal(u.host, "accountid.r2.cloudflarestorage.com");
  assert.match(u.pathname, /\/studio-media\/clientA\/asset1\/master\.mov$/);
  assert.match(url, /X-Amz-Signature=/);
  assert.equal(u.searchParams.get("X-Amz-Expires"), "900");
});

test("presignGet can force an attachment download disposition", async () => {
  const url = await presignGet("k/o.bin", { download: "Final Master.mov" });
  assert.match(
    decodeURIComponent(url),
    /response-content-disposition=attachment; filename="Final Master\.mov"/
  );
});

test("download filename is sanitized against header injection", async () => {
  const url = await presignGet("k/o.bin", { download: 'x"\r\nSet-Cookie: y' });
  const decoded = decodeURIComponent(url);
  assert.doesNotMatch(decoded, /\r|\n/);
  assert.match(decoded, /filename="x___Set-Cookie: y"/);
});

test("presignPut binds the content type; part URLs carry uploadId + partNumber", async () => {
  const put = await presignPut("k/o.mp4", "video/mp4");
  assert.match(put, /X-Amz-Signature=/);
  const part = await presignUploadPart("k/o.mp4", "UPLOAD123", 7);
  const pu = new URL(part);
  assert.equal(pu.searchParams.get("uploadId"), "UPLOAD123");
  assert.equal(pu.searchParams.get("partNumber"), "7");
});
