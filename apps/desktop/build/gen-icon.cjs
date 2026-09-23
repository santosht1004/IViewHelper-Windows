// Generates build/icon.png (512x512) — a purple "iV" app mark.
// Pure Node (zlib + crc), no external deps. Run: node build/gen-icon.cjs
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const SIZE = 512
const px = Buffer.alloc(SIZE * SIZE * 4) // RGBA

// Brand purple (matches tray icon): #6C63FF
const PR = 108, PG = 99, PB = 255

function set(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  // simple alpha-over onto existing
  const sa = a / 255
  const da = px[i + 3] / 255
  const outA = sa + da * (1 - sa)
  if (outA === 0) return
  px[i] = Math.round((r * sa + px[i] * da * (1 - sa)) / outA)
  px[i + 1] = Math.round((g * sa + px[i + 1] * da * (1 - sa)) / outA)
  px[i + 2] = Math.round((b * sa + px[i + 2] * da * (1 - sa)) / outA)
  px[i + 3] = Math.round(outA * 255)
}

// Filled circle with soft anti-aliased edge + subtle vertical gradient
const cx = SIZE / 2, cy = SIZE / 2, R = SIZE * 0.46
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot(x - cx, y - cy)
    if (d <= R + 1) {
      const edge = Math.min(1, R - d + 1) // ~1px AA
      const a = Math.max(0, Math.min(1, edge)) * 255
      // gradient: lighter at top, base at bottom
      const t = y / SIZE
      const r = Math.round(PR + (150 - PR) * (1 - t) * 0.5)
      const g = Math.round(PG + (140 - PG) * (1 - t) * 0.5)
      const b = PB
      set(x, y, r, g, b, a)
    }
  }
}

// Draw white "iV" mark
function rect(x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) set(x, y, 255, 255, 255, 255)
}
function disc(x0, y0, rad) {
  for (let y = y0 - rad; y <= y0 + rad; y++)
    for (let x = x0 - rad; x <= x0 + rad; x++)
      if (Math.hypot(x - x0, y - y0) <= rad) set(x, y, 255, 255, 255, 255)
}
// distance to segment, for the "V" strokes
function stroke(ax, ay, bx, by, half) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  const minx = Math.min(ax, bx) - half, maxx = Math.max(ax, bx) + half
  const miny = Math.min(ay, by) - half, maxy = Math.max(ay, by) + half
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      let t = ((x - ax) * dx + (y - ay) * dy) / len2
      t = Math.max(0, Math.min(1, t))
      const px2 = ax + t * dx, py2 = ay + t * dy
      const dd = Math.hypot(x - px2, y - py2)
      if (dd <= half) set(Math.round(x), Math.round(y), 255, 255, 255, 255)
    }
  }
}

// "i" on the left
rect(190, 235, 26, 110)   // stem
disc(203, 205, 16)        // dot
// "V" on the right
stroke(255, 235, 295, 345, 14)
stroke(335, 235, 295, 345, 14)

// --- PNG encode ---
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
// add filter byte (0) per scanline
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}
const idat = zlib.deflateSync(raw, { level: 9 })
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const out = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
const dest = path.join(__dirname, 'icon.png')
fs.writeFileSync(dest, out)
console.log('Wrote', dest, out.length, 'bytes')
