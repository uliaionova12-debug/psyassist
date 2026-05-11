'use strict';

const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const toIco = require('to-ico');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE =
  '/Users/uliaionova/.cursor/projects/Users-uliaionova-psyassist/assets/ChatGPT_Image_11_____2026__.__10_19_37-947867d3-80dc-41ea-96b5-a55fb0c932df.png';
const SOURCE = process.argv[2] || DEFAULT_SOURCE;
const BG = '#050508';
const SIZES = [16, 32, 48, 72, 96, 128, 180, 192, 256, 512, 1024];

async function renderSize(inputPath, size) {
  return sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: BG,
      position: 'center',
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await fs.access(SOURCE);

  const iconsDir = path.join(ROOT, 'public', 'icons');
  await fs.mkdir(iconsDir, { recursive: true });

  /** @type {Map<number, Buffer>} */
  const buffers = new Map();
  for (const s of SIZES) {
    const buf = await renderSize(SOURCE, s);
    buffers.set(s, buf);
    await fs.writeFile(path.join(iconsDir, `icon-${s}.png`), buf);
  }

  await fs.writeFile(path.join(ROOT, 'src', 'app', 'icon.png'), buffers.get(512));
  await fs.writeFile(path.join(ROOT, 'src', 'app', 'apple-icon.png'), buffers.get(180));

  const icoBuf = await toIco([buffers.get(16), buffers.get(32)]);
  await fs.writeFile(path.join(ROOT, 'src', 'app', 'favicon.ico'), icoBuf);

  // eslint-disable-next-line no-console -- CLI feedback
  console.log(
    `Wrote ${SIZES.length} PNGs under public/icons/, app/icon.png (512), apple-icon.png (180), favicon.ico (16+32).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
