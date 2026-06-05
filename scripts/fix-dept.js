const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/<div className="core-dept-label"[^>]+>\{p\.d\}<\/div>\r?\n/, '');
fs.writeFileSync(file, c, 'utf8');
console.log('OK');