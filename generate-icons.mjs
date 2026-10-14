import fs from "fs";
import path from "path";
import zlib from "zlib";

function createPNG(size, r, g, b) {
  const width = size;
  const height = size;

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 2; // Color type: 2 (Truecolor RGB)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk("IHDR", ihdr);

  // Raw Image Data (Filter byte 0 + RGB for each pixel)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Draw rounded border or solid dark background (#18181b = 24, 24, 27)
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);

  // IEND Chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);

  const crcData = Buffer.alloc(4 + length);
  chunk.copy(crcData, 0, 4, 8 + length);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);

  return chunk;
}

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve("public");
const icon192 = createPNG(192, 24, 24, 27); // #18181b
const icon512 = createPNG(512, 24, 24, 27);

fs.writeFileSync(path.join(publicDir, "icon-192.png"), icon192);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), icon512);

console.log("✅ Successfully created icon-192.png and icon-512.png in public/");
