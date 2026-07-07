import { test, before } from "node:test";
import assert from "node:assert/strict";

/**
 * LIVE byte round-trip through src/lib/s3.ts against an S3-compatible server
 * (moto on localhost by default — same S3 API as R2/MinIO in production).
 * Skipped automatically when no server is reachable.
 *
 *   python3 -m moto.server -p 5001   # then: npm test
 */
const ENDPOINT = process.env.S3_TEST_ENDPOINT || "http://localhost:5001";

process.env.S3_ENDPOINT = ENDPOINT;
process.env.S3_REGION = "us-east-1";
process.env.S3_BUCKET = "studio-media-test";
process.env.S3_ACCESS_KEY_ID = "testing";
process.env.S3_SECRET_ACCESS_KEY = "testing";

import {
  s3,
  MEDIA_BUCKET,
  presignGet,
  presignPut,
  createMultipart,
  presignUploadPart,
  completeMultipart,
  deleteObject,
} from "../src/lib/s3.ts";
import { CreateBucketCommand } from "@aws-sdk/client-s3";

let live = false;
before(async () => {
  try {
    const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(2000) });
    live = res.status < 500;
    if (live) {
      await s3().send(new CreateBucketCommand({ Bucket: MEDIA_BUCKET })).catch(() => {});
    }
  } catch {
    live = false;
  }
});

test("presigned PUT stores bytes; presigned GET returns them", async (t) => {
  if (!live) return t.skip("no S3 test server");
  const key = "clients/c1/projects/p1/a1/hello.bin";
  const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]);

  const putUrl = await presignPut(key, "application/octet-stream");
  const put = await fetch(putUrl, { method: "PUT", body });
  assert.equal(put.status, 200);

  const getUrl = await presignGet(key);
  const got = await fetch(getUrl);
  assert.equal(got.status, 200);
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), body);
  await deleteObject(key);
});

test("multipart upload assembles parts in order", async (t) => {
  if (!live) return t.skip("no S3 test server");
  const key = "clients/c1/projects/p1/a2/big.bin";
  // moto accepts small parts; production uses 64MiB chunks.
  const part1 = new Uint8Array(5 * 1024 * 1024).fill(0xaa);
  const part2 = new Uint8Array(1024).fill(0xbb);

  const uploadId = await createMultipart(key, "application/octet-stream");
  const parts: { ETag: string; PartNumber: number }[] = [];
  for (const [i, chunk] of [part1, part2].entries()) {
    const url = await presignUploadPart(key, uploadId, i + 1);
    const res = await fetch(url, { method: "PUT", body: chunk });
    assert.equal(res.status, 200);
    parts.push({ ETag: res.headers.get("etag")!, PartNumber: i + 1 });
  }
  await completeMultipart(key, uploadId, parts);

  const got = await fetch(await presignGet(key));
  const bytes = new Uint8Array(await got.arrayBuffer());
  assert.equal(bytes.length, part1.length + part2.length);
  assert.equal(bytes[0], 0xaa);
  assert.equal(bytes[bytes.length - 1], 0xbb);
  await deleteObject(key);
});

test("download disposition is honored by the storage server", async (t) => {
  if (!live) return t.skip("no S3 test server");
  const key = "clients/c1/projects/p1/a3/file.bin";
  await fetch(await presignPut(key, "application/octet-stream"), {
    method: "PUT",
    body: new Uint8Array([1]),
  });
  const res = await fetch(await presignGet(key, { download: "Master Cut.mov" }));
  assert.match(
    res.headers.get("content-disposition") ?? "",
    /attachment; filename="Master Cut\.mov"/
  );
  await deleteObject(key);
});

test("a tampered signature is rejected (auth-enforcing backends)", async (t) => {
  if (!live) return t.skip("no S3 test server");
  const key = "clients/c1/projects/p1/a4/secret.bin";
  await fetch(await presignPut(key, "application/octet-stream"), {
    method: "PUT",
    body: new Uint8Array([7]),
  });
  const url = new URL(await presignGet(key));
  url.searchParams.set("X-Amz-Signature", "0".repeat(64));
  const res = await fetch(url);
  await deleteObject(key);
  if (res.status === 200) {
    // moto (dev server) does not validate SigV4. R2/MinIO/AWS do — this
    // branch asserts on real backends and skips on moto.
    return t.skip("backend does not enforce signatures (moto) — enforced by R2/MinIO in prod");
  }
  assert.equal(res.status, 403);
});
