/**
 * generate-icons.js
 * Run with: node generate-icons.js
 * Requires: npm install canvas (optional - uses SVG fallback)
 *
 * This script generates PWA icons by creating SVG files that can be
 * converted to PNG using tools like Inkscape, SVGR, or online converters.
 *
 * For production, replace with actual branded icons.
 */

const fs   = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const dir   = path.join(__dirname, 'src', 'assets', 'icons');

sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1565c0"/>
  <text x="50" y="68" font-family="Arial" font-size="55" font-weight="bold"
        fill="white" text-anchor="middle">A</text>
</svg>`;
  fs.writeFileSync(path.join(dir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('\nNote: Convert SVG files to PNG for production use.');
console.log('You can use: npx svgexport or ImageMagick convert command.');
