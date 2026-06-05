const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /style=\{\{fontSize:'0\.68rem',fontWeight:700,textTransform:'uppercase',flexShrink:0\}\}/g,
  "style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',flexShrink:0,pointerEvents:'none'}}"
);
c = c.replace(
  /style=\{\{fontSize:'0\.72rem',fontWeight:800,textTransform:'uppercase',flexShrink:0\}\}/g,
  "style={{fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',flexShrink:0,pointerEvents:'none'}}"
);

fs.writeFileSync(file, c, 'utf8');
console.log('OK');
