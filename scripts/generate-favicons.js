/**
 * Script to generate favicon.ico and apple-icon.png from icon.svg
 * 
 * Requirements:
 * npm install --save-dev sharp to-ico
 * 
 * Run: node scripts/generate-favicons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
let toIco;
try {
  sharp = require('sharp');
  toIco = require('to-ico');
} catch (e) {
  console.error('Error: Required packages not found.');
  console.error('Please install: npm install --save-dev sharp to-ico');
  process.exit(1);
}

const iconSvgPath = path.join(__dirname, '../app/icon.svg');
const faviconIcoPath = path.join(__dirname, '../app/favicon.ico');
const appleIconPath = path.join(__dirname, '../app/apple-icon.png');

async function generateFavicons() {
  try {
    // Read SVG
    const svgBuffer = fs.readFileSync(iconSvgPath);
    
    // Generate favicon.ico (16x16, 32x32, 48x48)
    console.log('Generating favicon.ico...');
    const sizes = [16, 32, 48];
    const pngBuffers = await Promise.all(
      sizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    const icoBuffer = await toIco(pngBuffers);
    fs.writeFileSync(faviconIcoPath, icoBuffer);
    console.log('✓ Generated favicon.ico');
    
    // Generate apple-icon.png (180x180)
    console.log('Generating apple-icon.png...');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(appleIconPath);
    console.log('✓ Generated apple-icon.png');
    
    console.log('\n✅ All favicon files generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();

