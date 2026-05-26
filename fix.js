const fs = require('fs');
const content = fs.readFileSync('src/app/App.tsx', 'utf8');
const lines = content.split('\n');
// We want to delete from line 896 to 1091 (0-indexed 895 to 1090)
lines.splice(895, 1091 - 896 + 1);
fs.writeFileSync('src/app/App.tsx', lines.join('\n'));
