const fs = require('fs');
const path = require('path');

// Copy swagger.json to dist/docs after TypeScript compilation
const src = path.join(__dirname, 'src', 'docs', 'swagger.json');
const dest = path.join(__dirname, 'dist', 'docs', 'swagger.json');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);

console.log('✅ swagger.json copied to dist/docs/swagger.json');
