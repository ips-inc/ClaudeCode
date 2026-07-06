import { test } from "node:test";
import assert from "node:assert/strict";
import { sniff, disposition, isDangerousInline } from "../src/lib/filetype.ts";

const b = (...n: number[]) => new Uint8Array(n);

test("detects real types by magic bytes", () => {
  assert.equal(sniff(b(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0)).mime, "image/jpeg");
  assert.equal(sniff(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)).mime, "image/png");
  assert.equal(sniff(b(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d)).mime, "video/mp4");
  assert.equal(sniff(b(0x25, 0x50, 0x44, 0x46, 0x2d)).mime, "application/pdf");
  assert.equal(sniff(b(0x49, 0x49, 0x2a, 0x00)).mime, "image/tiff"); // TIFF / many camera RAW
});

test("images/video are inline-able; archives and unknown force download", () => {
  assert.equal(sniff(b(0xff, 0xd8, 0xff)).forceDownload, false);
  assert.equal(sniff(b(0x50, 0x4b, 0x03, 0x04)).forceDownload, true); // zip
  assert.equal(sniff(b(1, 2, 3, 4, 5, 6, 7, 8)).forceDownload, true); // unknown binary
});

test("never trusts a dangerous client-declared type", () => {
  // HTML bytes with a declared text/html must be neutralized to octet-stream + download.
  const r = sniff(b(0x3c, 0x21, 0x64, 0x6f, 0x63), "text/html");
  assert.equal(r.mime, "application/octet-stream");
  assert.equal(r.forceDownload, true);
  assert.equal(isDangerousInline("image/svg+xml"), true);
  assert.equal(isDangerousInline("text/javascript"), true);
});

test("unknown binary keeps a safe declared type but stays download-only", () => {
  const r = sniff(b(1, 2, 3, 4), "application/x-arri-raw");
  assert.equal(r.mime, "application/x-arri-raw");
  assert.equal(r.forceDownload, true);
});

test("disposition sanitizes the filename and picks inline vs attachment", () => {
  assert.equal(disposition("clip.mp4", false), 'inline; filename="clip.mp4"');
  assert.match(disposition('a"b\r\n.zip', true), /^attachment; filename="a_b__.zip"$/);
});
