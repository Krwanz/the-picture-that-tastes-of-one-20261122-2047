// the-picture-that-tastes-of-one-20261122-2047
// Copies entry.png (one picture of food that tastes of one ingredient:
// a single perfect ripe mango, halved) to MAKEFUN_OUTPUT_DIR and verifies
// it is a whole valid PNG within the size caps.
// Node 22, standard library only, no network.
const fs = require("fs");
const path = require("path");

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_DIM = 1024;
const MAX_BYTES = 1048576;
const IEND_CRC = 0xae426082;

function fail(msg) {
  console.error("error: " + msg);
  process.exit(1);
}

const srcPath = path.join(__dirname, "entry.png");
let src;
try {
  src = fs.readFileSync(srcPath);
} catch (e) {
  fail("cannot read entry.png: " + e.message);
}

if (src.length < 8 || !src.subarray(0, 8).equals(PNG_MAGIC)) {
  fail("entry.png does not start with the PNG magic bytes");
}
if (src.length > MAX_BYTES) {
  fail("entry.png is " + src.length + " bytes, over the 1048576 byte cap");
}

// Walk the chunks: first chunk must be IHDR, last chunk must be IEND.
let offset = 8;
let width = 0;
let height = 0;
let seenIhdr = false;
let seenIend = false;
while (offset + 8 <= src.length) {
  const len = src.readUInt32BE(offset);
  const type = src.toString("ascii", offset + 4, offset + 8);
  if (offset + 12 + len > src.length) {
    fail("truncated chunk " + type);
  }
  if (offset === 8 && type !== "IHDR") {
    fail("first chunk is " + type + ", expected IHDR");
  }
  if (type === "IHDR") {
    if (len !== 13) fail("IHDR chunk has wrong length " + len);
    width = src.readUInt32BE(offset + 8);
    height = src.readUInt32BE(offset + 12);
    seenIhdr = true;
  }
  if (type === "IEND") {
    if (len !== 0) fail("IEND chunk has non-zero length " + len);
    const crc = src.readUInt32BE(offset + 8);
    if (crc !== IEND_CRC) fail("IEND CRC mismatch");
    if (offset + 12 !== src.length) fail("trailing bytes after IEND chunk");
    seenIend = true;
    break;
  }
  offset += 12 + len;
}
if (!seenIhdr) fail("no IHDR chunk found");
if (!seenIend) fail("no complete IEND chunk found");
if (width > MAX_DIM || height > MAX_DIM) {
  fail("entry.png is " + width + "x" + height + ", over the 1024x1024 cap");
}
if (width === 0 || height === 0) fail("entry.png has zero dimension");

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  fail("MAKEFUN_OUTPUT_DIR is not set");
}

fs.mkdirSync(outDir, { recursive: true });
// Clear ONLY the contents of the output dir, never the dir itself.
for (const entry of fs.readdirSync(outDir)) {
  fs.rmSync(path.join(outDir, entry), { recursive: true, force: true });
}

const outPath = path.join(outDir, "entry.png");
fs.writeFileSync(outPath, src);

const written = fs.readFileSync(outPath);
if (written.length !== src.length) {
  fail("written size " + written.length + " does not match source " + src.length);
}
if (!written.equals(src)) {
  fail("written bytes do not match source entry.png");
}

console.log("wrote entry.png (" + width + "x" + height + ", " + src.length + " bytes)");
