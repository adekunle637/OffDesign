import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = resolve('public/icons');

await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  const png = createIconPng(size);
  await writeFile(resolve(outputDir, `icon-${size}.png`), png);
}

console.info(`Generated ${sizes.length} PWA icons in ${dirname(resolve(outputDir, 'icon.png'))}.`);

function createIconPng(size) {
  const pixels = new Uint8Array(size * size * 4);
  fillRect(pixels, size, 0, 0, size, size, [22, 27, 34, 255]);

  const margin = Math.round(size * 0.25);
  const bar = Math.round(size * 0.125);
  const stemWidth = Math.round(size * 0.125);
  const cream = [247, 242, 232, 255];
  const green = [59, 178, 115, 255];
  const gold = [216, 163, 26, 255];

  fillRect(pixels, size, margin, margin, stemWidth, size - margin * 2, cream);
  fillRect(pixels, size, margin, margin, size - margin * 2, bar, cream);
  fillRect(pixels, size, margin, Math.round(size * 0.52), Math.round(size * 0.38), bar, cream);
  fillRect(
    pixels,
    size,
    Math.round(size * 0.6),
    Math.round(size * 0.5),
    stemWidth,
    Math.round(size * 0.38),
    green,
  );
  drawLine(
    pixels,
    size,
    Math.round(size * 0.41),
    Math.round(size * 0.25),
    Math.round(size * 0.66),
    Math.round(size * 0.38),
    Math.max(2, Math.round(size * 0.035)),
    gold,
  );

  return encodePng(size, size, pixels);
}

function fillRect(pixels, size, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      setPixel(pixels, size, col, row, color);
    }
  }
}

function drawLine(pixels, size, x1, y1, x2, y2, width, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(x1 + dx * t);
    const y = Math.round(y1 + dy * t);
    fillCircle(pixels, size, x, y, width, color);
  }
}

function fillCircle(pixels, size, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
        setPixel(pixels, size, x, y, color);
      }
    }
  }
}

function setPixel(pixels, size, x, y, [red, green, blue, alpha]) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const offset = (y * size + x) * 4;
  pixels[offset] = red;
  pixels[offset + 1] = green;
  pixels[offset + 2] = blue;
  pixels[offset + 3] = alpha;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    createChunk('IHDR', createIhdr(width, height)),
    createChunk('IDAT', deflateSync(raw)),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createIhdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.concat([typeBuffer, data]);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(chunk), 8 + data.length);
  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
