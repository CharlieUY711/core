const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');

// Reemplazar el span COMPRAR por selector de cantidad + COMPRAR
const oldRight = `<span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',pointerEvents:'none'}}>{p.stock===0?'Sin stock':'COMPRAR'}</span>`;
const newRight = `<span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',pointerEvents:'none'}}>
  <button onClick={(e)=>{e.stopPropagation();}} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:'18px',height:'18px',borderRadius:'3px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'all'}}>−</button>
  <span style={{fontSize:'0.72rem',fontWeight:700,minWidth:'14px',textAlign:'center'}}>1</span>
  <button onClick={(e)=>{e.stopPropagation();}} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:'18px',height:'18px',borderRadius:'3px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'all'}}>+</button>
  <span style={{fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',marginLeft:'4px'}}>{p.stock===0?'Sin stock':'COMPRAR'}</span>
</span>`;

while(c.includes(oldRight)) c = c.replace(oldRight, newRight);
fs.writeFileSync(file, c, 'utf8');
console.log('OK');