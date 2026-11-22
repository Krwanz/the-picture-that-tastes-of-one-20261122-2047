// the-picture-that-tastes-of-one-20261122-2047
// Entry program: a single picture of food that tastes of one ingredient —
// one perfect ripe mango, halved. Copies entry.png into
// MAKEFUN_OUTPUT_DIR, after checking the PNG is complete and within the
// size limits. Node 22, standard library only, no network access.
const fs = require("fs");
const path = require("path");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_SIDE = 1024;
const MAX_FILE_BYTES = 1048576;
const EXPECTED_IEND_CRC = 0xae426082;

function die(message) {
  console.error("error: " + message);
  process.exit(1);
}

const imagePath = path.join(__dirname, "entry.png");
let image;
try {
  image = fs.readFileSync(imagePath);
} catch (err) {
  die("cannot read entry.png: " + err.message);
}

if (image.length < 8 || !image.subarray(0, 8).equals(PNG_SIGNATURE)) {
  die("entry.png does not begin with the PNG signature");
}
if (image.length > MAX_FILE_BYTES) {
  die("entry.png is " + image.length + " bytes, above the 1048576 byte limit");
}

// Step through every chunk: IHDR must come first, IEND must close the file.
let cursor = 8;
let picWidth = 0;
let picHeight = 0;
let foundIhdr = false;
let foundIend = false;
while (cursor + 8 <= image.length) {
  const chunkLen = image.readUInt32BE(cursor);
  const chunkType = image.toString("ascii", cursor + 4, cursor + 8);
  if (cursor + 12 + chunkLen > image.length) {
    die("chunk " + chunkType + " is cut off");
  }
  if (cursor === 8 && chunkType !== "IHDR") {
    die("first chunk is " + chunkType + ", expected IHDR");
  }
  if (chunkType === "IHDR") {
    if (chunkLen !== 13) die("IHDR length is " + chunkLen + ", expected 13");
    picWidth = image.readUInt32BE(cursor + 8);
    picHeight = image.readUInt32BE(cursor + 12);
    foundIhdr = true;
  }
  if (chunkType === "IEND") {
    if (chunkLen !== 0) die("IEND chunk length is " + chunkLen + ", expected 0");
    if (image.readUInt32BE(cursor + 8) !== EXPECTED_IEND_CRC) {
      die("IEND CRC does not match");
    }
    if (cursor + 12 !== image.length) die("bytes follow the IEND chunk");
    foundIend = true;
    break;
  }
  cursor += 12 + chunkLen;
}
if (!foundIhdr) die("no IHDR chunk found");
if (!foundIend) die("no complete IEND chunk found");
if (picWidth === 0 || picHeight === 0) die("entry.png has a zero dimension");
if (picWidth > MAX_SIDE || picHeight > MAX_SIDE) {
  die("entry.png is " + picWidth + "x" + picHeight + ", above the 1024x1024 limit");
}

const outputDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outputDir) {
  die("MAKEFUN_OUTPUT_DIR is not set");
}

fs.mkdirSync(outputDir, { recursive: true });
// Empty the output directory's contents only — never remove the directory.
for (const name of fs.readdirSync(outputDir)) {
  fs.rmSync(path.join(outputDir, name), { recursive: true, force: true });
}

const destPath = path.join(outputDir, "entry.png");
fs.writeFileSync(destPath, image);

const writtenBack = fs.readFileSync(destPath);
if (writtenBack.length !== image.length) {
  die("written size " + writtenBack.length + " differs from source " + image.length);
}
if (!writtenBack.equals(image)) {
  die("written bytes differ from source entry.png");
}
// Confirm the copy kept the same picture size: parse the written file's
// IHDR and compare its width and height with the source image's.
const outWidth = writtenBack.readUInt32BE(16);
const outHeight = writtenBack.readUInt32BE(20);
if (outWidth !== picWidth || outHeight !== picHeight) {
  die(
    "written entry.png is " + outWidth + "x" + outHeight +
    ", source is " + picWidth + "x" + picHeight
  );
}

console.log("wrote entry.png (" + picWidth + "x" + picHeight + ", " + image.length + " bytes)");
