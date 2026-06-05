const fs = require('fs');
const file = 'C:\\CORE\\apps\\core-market\\src\\app\\public\\ProductCard.tsx';
let c = fs.readFileSync(file, 'utf8');

// Fix qty buttons - sin recuadro, más chicos
const oldMinus = `<button onClick={(e)=>{e.stopPropagation();}} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:'18px',height:'18px',borderRadius:'3px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'all'}}>−</button>`;
const newMinus = `<button onClick={(e)=>{e.stopPropagation();}} style={{background:'transparent',border:'none',color:'#fff',cursor:'pointer',fontSize:'12px',padding:'0 2px',pointerEvents:'all',opacity:0.8}}>−</button>`;

const oldPlus = `<button onClick={(e)=>{e.stopPropagation();}} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:'18px',height:'18px',borderRadius:'3px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'all'}}>+</button>`;
const newPlus = `<button onClick={(e)=>{e.stopPropagation();}} style={{background:'transparent',border:'none',color:'#fff',cursor:'pointer',fontSize:'12px',padding:'0 2px',pointerEvents:'all',opacity:0.8}}>+</button>`;

// Remove black separators
c = c.replace(/<span style=\{\{width:"1px",background:"rgba\(0,0,0,\.3\)"[^}]+\}\}><\/span>/g, '');

c = c.replace(oldMinus, newMinus);
c = c.replace(oldPlus, newPlus);

fs.writeFileSync(file, c, 'utf8');
console.log('OK');