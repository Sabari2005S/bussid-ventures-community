const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createPngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePngBuffer(width, height) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // Scanlines with drawing
  // Colors:
  // Background: deep dark #0b0c10 (11, 12, 16, 255)
  // Neon Green: #7cff00 (124, 255, 0, 255)
  // Cyan: #00f0ff (0, 240, 255, 255)
  // White: #ffffff (255, 255, 255, 255)
  // Bus Body: #121824 (18, 24, 36, 255)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.44;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: dark ink #0a0b10
      let rCol = 10;
      let gCol = 11;
      let bCol = 16;
      let aCol = 255;

      // Rounded app icon border
      if (dist > r - 4 && dist <= r) {
        // Outer glowing cyber neon border
        rCol = 124;
        gCol = 255;
        bCol = 0;
      } else if (dist < r - 4) {
        // Subtle radial gradient
        const grad = 1 - (dist / r) * 0.3;
        rCol = Math.min(255, Math.floor(14 * grad));
        gCol = Math.min(255, Math.floor(18 * grad));
        bCol = Math.min(255, Math.floor(28 * grad));

        // Draw Stylized Bus Shape
        // Bus body box: x between 30% and 70%, y between 25% and 72%
        const bx1 = width * 0.28;
        const bx2 = width * 0.72;
        const by1 = height * 0.22;
        const by2 = height * 0.70;

        if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) {
          // Inside Bus bounding box
          rCol = 18;
          gCol = 24;
          bCol = 36;

          // Bus Outer border
          if (x === Math.floor(bx1) || x === Math.floor(bx2) || y === Math.floor(by1) || y === Math.floor(by2)) {
            rCol = 124;
            gCol = 255;
            bCol = 0;
          }

          // Destination board at top
          if (y >= height * 0.25 && y <= height * 0.31 && x >= width * 0.35 && x <= width * 0.65) {
            rCol = 124;
            gCol = 255;
            bCol = 0;
          }

          // Windshield (cyan / blue)
          if (y >= height * 0.34 && y <= height * 0.52 && x >= width * 0.32 && x <= width * 0.68) {
            // Windshield wiper center divider
            if (Math.abs(x - cx) <= width * 0.01) {
              rCol = 10;
              gCol = 14;
              bCol = 20;
            } else {
              rCol = 0;
              gCol = 220;
              bCol = 255;
            }
          }

          // Headlights
          const isLeftHeadlight = (y >= height * 0.58 && y <= height * 0.64 && x >= width * 0.32 && x <= width * 0.42);
          const isRightHeadlight = (y >= height * 0.58 && y <= height * 0.64 && x >= width * 0.58 && x <= width * 0.68);
          if (isLeftHeadlight || isRightHeadlight) {
            rCol = 124;
            gCol = 255;
            bCol = 0;
          }

          // Center Grille
          if (y >= height * 0.60 && y <= height * 0.65 && x >= width * 0.45 && x <= width * 0.55) {
            rCol = 40;
            gCol = 50;
            bCol = 70;
          }
        }

        // Mirrors
        const isLeftMirror = (x >= width * 0.23 && x <= width * 0.27 && y >= height * 0.36 && y <= height * 0.46);
        const isRightMirror = (x >= width * 0.73 && x <= width * 0.77 && y >= height * 0.36 && y <= height * 0.46);
        if (isLeftMirror || isRightMirror) {
          rCol = 124;
          gCol = 255;
          bCol = 0;
        }

        // Tires
        const isLeftTire = (x >= width * 0.30 && x <= width * 0.38 && y >= height * 0.70 && y <= height * 0.77);
        const isRightTire = (x >= width * 0.62 && x <= width * 0.70 && y >= height * 0.70 && y <= height * 0.77);
        if (isLeftTire || isRightTire) {
          rCol = 10;
          gCol = 12;
          bCol = 16;
        }
      }

      rawData[offset++] = rCol;
      rawData[offset++] = gCol;
      rawData[offset++] = bCol;
      rawData[offset++] = aCol;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', idatData);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 192x192
const buf192 = generatePngBuffer(192, 192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), buf192);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), buf192);
console.log('Created icon-192.png & icon-maskable-192.png (' + buf192.length + ' bytes)');

// 512x512
const buf512 = generatePngBuffer(512, 512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), buf512);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), buf512);
console.log('Created icon-512.png & icon-maskable-512.png (' + buf512.length + ' bytes)');
