const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Sacar core-dept-label de la foto
c = c.replace(/<div className="core-dept-label"[^>]+>\{p\.d\}<\/div>\r?\n/, '');

// 2. Sacar p.d de la barra del reverso
c = c.replace(/<div style=\{\{\s*color: '#000000',[\s\S]*?\}\}>\{p\.d\}<\/div>\r?\n/, '');

fs.writeFileSync(file, c, 'utf8');
console.log('OK');
