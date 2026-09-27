const fs = require('fs');
const path = require('path');

// A simple helper to read image headers and find dimensions for JPG/PNG
function getDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // Check if JPG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let i = 2;
    while (i < buffer.length) {
      if (buffer[i] === 0xFF && buffer[i+1] >= 0xC0 && buffer[i+1] <= 0xC3) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
      const length = buffer.readUInt16BE(i + 2);
      i += 2 + length;
    }
  }
  
  // Check if PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  
  return null;
}

const publicDir = path.join(__dirname, '../public');
fs.readdirSync(publicDir).forEach(file => {
  if (file.endsWith('.jpg') || file.endsWith('.png')) {
    const filePath = path.join(publicDir, file);
    const dims = getDimensions(filePath);
    console.log(`${file}:`, dims ? `${dims.width}x${dims.height}` : 'unknown');
  }
});
