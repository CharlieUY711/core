const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');

// Reemplazar botones
const search = "style={p.stock === 0 ? { background: '#ccc', cursor: 'not-allowed', color: '#888' } : btnStyle}>\r\n              {p.stock === 0 ? 'Sin stock' : label}";
const replace = "style={{...(p.stock===0?{background:'#ccc',cursor:'not-allowed',color:'#888'}:btnStyle),display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 10px',width:'100%',gap:'6px'}}>\r\n              <span style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',flexShrink:0}}>{p.d}</span>\r\n              <svg viewBox=\"0 0 24 24\" width=\"13\" height=\"13\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"1.8\"><path d=\"M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z\"/></svg>\r\n              <span style={{fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',flexShrink:0}}>{p.stock===0?'Sin stock':'COMPRAR'}</span>";

const count = (c.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))||[]).length;
console.log('Matches found:', count);
while(c.includes(search)) c = c.replace(search, replace);
fs.writeFileSync(file, c, 'utf8');
console.log('OK - COMPRAR:', (c.match(/COMPRAR/g)||[]).length);