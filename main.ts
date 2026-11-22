// the-picture-that-tastes-of-one-20261122-2047
// Writes one picture of food to $MAKEFUN_OUTPUT_DIR/entry.png:
// a single ripe mango, halved — one ingredient, one flavour.
// Node 22, standard library only, no network.
// Never removes the output directory itself; only its contents.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'entry.png';
const OUT = 'entry.png';
const MAX_BYTES = 1048576;
const MAX_DIM = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(check, detail) {
  console.error(`error: ${check} failed — ${detail}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, SRC);

let src;
try {
  src = readFileSync(srcPath);
} catch (err) {
  fail('source readable', `could not read ${SRC}: ${err.message}`);
}

if (!src.subarray(0, 8).equals(PNG_MAGIC)) {
  fail('PNG magic', `${SRC} does not start with the PNG magic bytes`);
}
if (src.length < 33 || src.toString('ascii', 12, 16) !== 'IHDR') {
  fail('IHDR present', `${SRC} has no IHDR chunk where one is expected`);
}
const width = src.readUInt32BE(16);
const height = src.readUInt32BE(20);
if (width > MAX_DIM || height > MAX_DIM) {
  fail('dimensions', `${SRC} is ${width}x${height}, over the ${MAX_DIM}x${MAX_DIM} cap`);
}
if (src.length > MAX_BYTES) {
  fail('file size', `${SRC} is ${src.length} bytes, over the ${MAX_BYTES} byte cap`);
}
// A whole PNG ends with a 12-byte IEND chunk (length 0, type "IEND",
// CRC 0xAE426082). Refuse a truncated file rather than handing the
// judge a broken image.
const tail = src.subarray(src.length - 12);
if (src.length < 12 || tail.readUInt32BE(0) !== 0 || tail.toString('ascii', 4, 8) !== 'IEND' || tail.readUInt32BE(8) !== 0xae426082) {
  fail('IEND complete', `${SRC} does not end with a complete IEND chunk — the file may be truncated`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  fail('output directory', 'MAKEFUN_OUTPUT_DIR is not set');
}
mkdirSync(outDir, { recursive: true });
// Clear only the contents of the output directory, never the
// directory itself (removing it fails with EPERM on the grader).
for (const name of readdirSync(outDir)) {
  rmSync(join(outDir, name), { recursive: true, force: true });
}
const outPath = join(outDir, OUT);
writeFileSync(outPath, src);

const written = statSync(outPath);
if (written.size !== src.length) {
  fail('output complete', `${OUT} is ${written.size} bytes, expected ${src.length} bytes`);
}
const back = readFileSync(outPath);
if (!back.equals(src)) {
  fail('output matches source', `${OUT} does not match ${SRC} byte for byte`);
}

console.log(`wrote ${OUT} (${width}x${height}, ${written.size} bytes)`);
