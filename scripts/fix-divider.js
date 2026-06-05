const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');

const oldBtn = `display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 10px',width:'100%',gap:'6px'`;
const newBtn = `display:'flex',alignItems:'center',padding:'0',width:'100%',gap:'0'`;

const oldLeft = `<span style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',flexShrink:0,pointerEvents:'none'}}>{p.d}</span>`;
const newLeft = `<span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',pointerEvents:'none'}}>{p.d}</span><span style={{width:'1px',background:'rgba(0,0,0,.3)',alignSelf:'stretch'}}></span>`;

const oldRight = `<span style={{fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',flexShrink:0,pointerEvents:'none'}}>{p.stock===0?'Sin stock':'COMPRAR'}</span>`;
const newRight = `<span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',pointerEvents:'none'}}>{p.stock===0?'Sin stock':'COMPRAR'}</span>`;

while(c.includes(oldBtn)) c = c.replace(oldBtn, newBtn);
while(c.includes(oldLeft)) c = c.replace(oldLeft, newLeft);
while(c.includes(oldRight)) c = c.replace(oldRight, newRight);

fs.writeFileSync(file, c, 'utf8');
console.log('OK');