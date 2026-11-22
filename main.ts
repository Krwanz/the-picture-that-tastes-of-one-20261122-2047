// Copies entry.png (a single picture of food that tastes of one ingredient:
// a ripe mango, halved) to MAKEFUN_OUTPUT_DIR, verifying it is a whole,
// valid PNG within the size caps first. Node 22, standard library only.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, "entry.png");

let source;
try {
  source = readFileSync(sourcePath);
} catch {
  fail(`cannot read ${sourcePath}`);
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!source.subarray(0, 8).equals(PNG_MAGIC)) {
  fail("entry.png does not start with the PNG magic bytes");
}
if (source.length < 33 || source.toString("latin1", 12, 16) !== "IHDR") {
  fail("entry.png has no IHDR chunk");
}
const width = source.readUInt32BE(16);
const height = source.readUInt32BE(20);
if (width > 1024 || height > 1024) {
  fail(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
}
if (source.length > 1048576) {
  fail(`entry.png is ${source.length} bytes, over the 1048576-byte cap`);
}
const iend = source.subarray(source.length - 12);
if (
  iend.length !== 12 ||
  iend.readUInt32BE(0) !== 0 ||
  iend.toString("latin1", 4, 8) !== "IEND" ||
  iend.readUInt32BE(8) !== 0xae426082
) {
  fail("entry.png does not end with a complete IEND chunk");
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  fail("MAKEFUN_OUTPUT_DIR is not set");
}

mkdirSync(outDir, { recursive: true });
// Clear only the contents of the output dir, never the dir itself.
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

const outPath = join(outDir, "entry.png");
writeFileSync(outPath, source);

const written = statSync(outPath);
if (written.size !== source.length) {
  fail(`wrote ${written.size} bytes but source is ${source.length} bytes`);
}
if (!readFileSync(outPath).equals(source)) {
  fail("bytes read back from the output do not match entry.png");
}

console.log(`wrote entry.png (${width}x${height}, ${source.length} bytes)`);
