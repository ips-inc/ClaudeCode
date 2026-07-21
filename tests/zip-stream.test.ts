import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ZipArchive } from "archiver";

/**
 * Proves the "Download all" streaming pattern used by /api/share/[slug]/zip:
 * store-mode archiver, entries appended as streams and pumped sequentially,
 * produces a valid zip whose entries round-trip byte-for-byte. Validation is
 * done by Python's zipfile (an independent implementation); skipped if no
 * python3 on PATH.
 */

function hasPython(): boolean {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function buildZip(entries: { name: string; data: Buffer }[]): Promise<Buffer> {
  const archive = new ZipArchive({ store: true });
  const chunks: Buffer[] = [];
  archive.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });
  for (const e of entries) {
    const stream = Readable.from([e.data]);
    archive.append(stream, { name: e.name });
    await new Promise<void>((resolve, reject) => {
      stream.once("end", resolve);
      stream.once("error", reject);
    });
  }
  await archive.finalize();
  await done;
  return Buffer.concat(chunks);
}

test("streamed store-mode zip round-trips through an independent reader", { skip: !hasPython() && "no python3" }, async () => {
  const entries = [
    { name: "clip.mp4", data: Buffer.from("not really a video, but bytes are bytes") },
    { name: "photo.jpg", data: Buffer.alloc(256 * 1024, 7) }, // multi-chunk body
    { name: "notes (1).txt", data: Buffer.from("second file with the deduped name pattern") },
  ];
  const zip = await buildZip(entries);

  const dir = mkdtempSync(join(tmpdir(), "ziptest-"));
  try {
    const zipPath = join(dir, "out.zip");
    writeFileSync(zipPath, zip);
    // testzip() CRC-checks every member; then compare extracted bytes.
    const script = `
import sys, zipfile, hashlib
z = zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None, "corrupt member"
for n in z.namelist():
    sys.stdout.write(hashlib.sha256(z.read(n)).hexdigest() + " " + n + "\\n")
`;
    const out = execFileSync("python3", ["-c", script, zipPath], { encoding: "utf8" });
    // hash first — filenames may contain spaces.
    const got = new Map(
      out.trim().split("\n").map((l) => {
        const sp = l.indexOf(" ");
        return [l.slice(sp + 1), l.slice(0, sp)] as [string, string];
      })
    );
    assert.equal(got.size, entries.length);
    for (const e of entries) {
      const { createHash } = await import("node:crypto");
      assert.equal(got.get(e.name), createHash("sha256").update(e.data).digest("hex"), e.name);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
