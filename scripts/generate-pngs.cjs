const fs = require('fs');
const zlib = require('zlib');

function writeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tag = Buffer.from(type, 'ascii');
  // CRC32 implementation
  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c >>> 0;
      }
      crc32.table = table;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([tag, data]));
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);
  return Buffer.concat([len, tag, data, crcBuf]);
}

function createPNG(width, height, color=[255,255,255,255], opts={alpha:true}) {
  // color: [r,g,b,a]
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);
  ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; // bit depth
  ihdr[9]= opts.alpha ? 6 : 2; // color type: 6=RGBA, 2=RGB
  ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const IHDR = writeChunk('IHDR', ihdr);
  // raw image data: filter byte 0 then pixel data RGB or RGBA
  const bpp = opts.alpha ? 4 : 3;
  const rowBytes = width * bpp + 1;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y=0;y<height;y++){
    const rowStart = y*rowBytes;
    raw[rowStart]=0; // filter byte
    for (let x=0;x<width;x++){
      const p = rowStart + 1 + x*bpp;
      raw[p]=color[0];
      raw[p+1]=color[1];
      raw[p+2]=color[2];
      if (opts.alpha) raw[p+3]=color[3];
    }
  }
  const compressed = zlib.deflateSync(raw, {level:6});
  const IDAT = writeChunk('IDAT', compressed);
  const IEND = writeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, IHDR, IDAT, IEND]);
}

// crc package fallback if not installed
try { require('crc'); } catch (e) {
  // implement simple crc32
  const table = (() => {
    let c; const tab = new Uint32Array(256);
    for (let n=0;n<256;n++){
      c = n;
      for (let k=0;k<8;k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      tab[n]=c>>>0;
    }
    return tab;
  })();
  global.require = (m) => {
    if (m==='crc') return { crc32: (buf) => {
      let crc = 0 ^ (-1);
      for (let i=0;i<buf.length;i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
      return (crc ^ (-1)) >>> 0;
    }};
    return require(m);
  };
}

const outputs = [
  {path: 'public/icon-1024.png', w:1024, h:1024, color:[255,255,255,255], opts:{alpha:false}},
  {path: 'public/splash-200.png', w:200, h:200, color:[255,255,255,255], opts:{alpha:false}},
  {path: 'public/og-image-1200x630.png', w:1200, h:630, color:[240,240,240,255], opts:{alpha:false}},
  {path: 'public/hero-1200x630.png', w:1200, h:630, color:[240,240,240,255], opts:{alpha:false}},
  {path: 'public/Screenshot1-1284x2778.png', w:1284, h:2778, color:[230,230,230,255], opts:{alpha:false}},
  {path: 'public/Screenshot2-1284x2778.png', w:1284, h:2778, color:[220,220,220,255], opts:{alpha:false}},
  {path: 'public/Screenshot3-1284x2778.png', w:1284, h:2778, color:[200,200,200,255], opts:{alpha:false}}
];

for (const o of outputs) {
  console.log('Generating', o.path, `${o.w}x${o.h}`);
  const buf = createPNG(o.w,o.h,o.color,o.opts || {});
  fs.writeFileSync(o.path, buf);
}
console.log('Done');
