const fs = require('fs');
const path = require('path');

function readFileSync(p, len) {
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, 0);
  fs.closeSync(fd);
  return buf;
}

function checkPNG(p) {
  const buf = readFileSync(p, 24);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const ihdr = readFileSync(p, 33);
  const colorType = ihdr[25];
  const hasAlpha = [4,6].includes(colorType);
  return {format: 'png', width, height, hasAlpha};
}

function checkGIF(p) {
  const buf = readFileSync(p, 10);
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  return {format: 'gif', width, height};
}

function checkJPEG(p) {
  const fd = fs.openSync(p, 'r');
  const stat = fs.fstatSync(fd);
  const buf = Buffer.alloc(stat.size);
  fs.readSync(fd, buf, 0, stat.size, 0);
  fs.closeSync(fd);

  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] != 0xFF) { offset++; continue; }
    const marker = buf[offset+1];
    const length = buf.readUInt16BE(offset+2);
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2 || marker === 0xC3) {
      const height = buf.readUInt16BE(offset+5);
      const width = buf.readUInt16BE(offset+7);
      return {format: 'jpeg', width, height};
    }
    offset += 2 + length;
  }
  return {format: 'jpeg', width: null, height: null};
}

function checkWebP(p) {
  const buf = readFileSync(p, 30);
  if (buf.toString('ascii', 0,4) !== 'RIFF') return {format:'webp'};
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    const width = 1 + (buf[24] | (buf[25]<<8) | (buf[26]<<16));
    const height = 1 + (buf[27] | (buf[28]<<8) | (buf[29]<<16));
    return {format: 'webp', width, height};
  }
  return {format: 'webp'};
}

function inspect(p) {
  const ext = path.extname(p).toLowerCase();
  const stat = fs.statSync(p);
  try {
    if (ext === '.png') return {...checkPNG(p), size: stat.size};
    if (ext === '.gif') return {...checkGIF(p), size: stat.size};
    if (ext === '.jpg' || ext === '.jpeg') return {...checkJPEG(p), size: stat.size};
    if (ext === '.webp') return {...checkWebP(p), size: stat.size};
    return {format: ext.replace('.',''), size: stat.size};
  } catch (err) {
    return {error: String(err), size: stat.size};
  }
}

function walk(dir) {
  const res = [];
  const items = fs.readdirSync(dir);
  for (const it of items) {
    const full = path.join(dir, it);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) res.push(...walk(full));
    else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(it)) res.push(full);
  }
  return res;
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  console.error('public/ directory not found at', publicDir);
  process.exit(1);
}

const files = walk(publicDir);
const results = files.map(f => ({path: f.replace(/\\/g,'/'), info: inspect(f)}));
console.log(JSON.stringify(results, null, 2));
