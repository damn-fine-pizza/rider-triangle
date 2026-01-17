/**
 * Generate PWA icons from SVG favicon.
 * Run with: node scripts/generate-icons.js
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const svgPath = join(projectRoot, 'public', 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

async function generateIcons() {
  console.log('Generating PWA icons from favicon.svg...');

  for (const size of sizes) {
    const outputPath = join(projectRoot, 'public', `icon-${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created icon-${size}.png`);
  }

  // Also create apple-touch-icon (180x180)
  const applePath = join(projectRoot, 'public', 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(applePath);
  console.log('✓ Created apple-touch-icon.png (180x180)');

  console.log('\nDone! Update vite.config.js manifest to include these icons.');
}

generateIcons().catch(console.error);
