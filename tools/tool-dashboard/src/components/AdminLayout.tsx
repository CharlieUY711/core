import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useUserRole } from '../hooks/useUserRole';

const SIDEBAR_BG = '#0F3460';
const ACCENT     = '#FF7A00';
const GREEN      = '#1DC878';

interface ShopCtx {
  isSH: boolean; setIsSH: (v: boolean) => void;
  topStats: {label:string;value:number|string;color:string}[];
  setTopStats: (s: {label:string;value:number|string;color:string}[]) => void;
}
export const ShopContext = createContext<ShopCtx>({
  isSH:false, setIsSH:()=>{}, topStats:[], setTopStats:()=>{},
});
export const useShop = () => useContext(ShopContext);

function UserAvatar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`avatar_${user?.id}`);
    if (saved) setAvatar(saved);
  }, [user]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem(`avatar_${user?.id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:'0.75rem' }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <div onClick={() => inputRef.current?.click()}
          style={{ width:'44px', height:'44px', borderRadius:'50%', cursor:'pointer', overflow:'hidden',
            border:`2px solid ${isAdmin ? ACCENT : GREEN}`,
            background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:'1.25rem' }}>{isAdmin ? '👑' : '👤'}</span>}
        </div>
        <div onClick={() => inputRef.current?.click()}
          style={{ position:'absolute', bottom:'-2px', right:'-2px', width:'18px', height:'18px', borderRadius:'50%',
            background:ACCENT, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            fontSize:'0.6rem', border:'2px solid #0A2540' }}>✏️</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
      <div style={{ minWidth:0 }}>
        <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'0.75rem', fontWeight:600,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'140px' }}>
          {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario'}
        </div>
        <div style={{ color: isAdmin ? ACCENT : GREEN, fontSize:'0.68rem', fontWeight:700, marginTop:'2px' }}>
          {isAdmin ? 'Administrador' : 'Usuario'}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, isAdmin, loading } = useUserRole();
  const [isSH, setIsSH] = useState(false);
  const [topStats, setTopStats] = useState<{label:string;value:number|string;color:string}[]>([]);

  const commonMenu = [
    { path: '/admin',          label: '📊 Dashboard',          exact: true },
    { path: '/admin/orders',   label: '🛍 Órdenes'                          },
    { path: '/admin/products', label: '📦 Productos'                        },
  ];

  const adminMenu = [
    { path: '/admin/catalog',   label: '📋 Catálogo'     },
    { path: '/admin/analytics', label: '📈 Analytics'    },
    { path: '/admin/ml',        label: '🟡 MercadoLibre' },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:SIDEBAR_BG }}>
      <div style={{ color:ACCENT, fontSize:'1.1rem' }}>Cargando...</div>
    </div>
  );

  if (!user) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const currentLabel = (() => {
    const all = [...commonMenu, ...adminMenu];
    const found = all.find(m => isActive(m.path, (m as any).exact));
    return found?.label?.split(' ').slice(1).join(' ') || 'Dashboard';
  })();

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'DM Sans, sans-serif', background:'#F4F5F7' }}>

      {/* Sidebar */}
      <aside style={{ width:'220px', background:SIDEBAR_BG, display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh', flexShrink:0 }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color:'#fff', fontSize:'1.1rem', fontWeight:800, letterSpacing:'-0.02em' }}>
            Charlie<span style={{ color:ACCENT }}>Market</span>
          </div>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.65rem', marginTop:'2px' }}>Admin Panel</div>
        </div>

        <UserAvatar user={user} isAdmin={isAdmin} />

        <nav style={{ flex:1, overflowY:'auto', padding:'0.75rem 0' }}>
          {commonMenu.map(item => {
            const active = isActive(item.path, (item as any).exact);
            return (
              <Link key={item.path} to={item.path} style={{
                display:'block', padding:'0.55rem 1.5rem', textDecoration:'none', fontSize:'0.875rem',
                background: active ? 'rgba(255,122,0,0.15)' : 'transparent',
                color: active ? ACCENT : 'rgba(255,255,255,0.62)',
                borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                fontWeight: active ? 600 : 400, transition:'all 0.12s',
              }}>{item.label}</Link>
            );
          })}

          {isAdmin && (
            <>
              <div style={{ padding:'0.75rem 1.5rem 0.25rem', fontSize:'0.6rem', color:'rgba(255,255,255,0.3)',
                textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700 }}>Admin</div>
              {adminMenu.map(item => {
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} style={{
                    display:'block', padding:'0.55rem 1.5rem', textDecoration:'none', fontSize:'0.875rem',
                    background: active ? 'rgba(255,122,0,0.15)' : 'transparent',
                    color: active ? ACCENT : 'rgba(255,255,255,0.62)',
                    borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                    fontWeight: active ? 600 : 400, transition:'all 0.12s',
                  }}>{item.label}</Link>
                );
              })}
            </>
          )}
        </nav>

        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={handleLogout} style={{
            width:'100%', padding:'0.5rem', background:'rgba(255,255,255,0.06)',
            border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px',
            color:'rgba(255,255,255,0.6)', fontSize:'0.8rem', cursor:'pointer',
          }}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <header style={{ background:SIDEBAR_BG, padding:'0 1.5rem', height:'56px', display:'flex',
          alignItems:'center', gap:'1rem', justifyContent:'space-between',
          position:'sticky', top:0, zIndex:10, boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>
          <h1 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'rgba(255,255,255,0.9)', whiteSpace:'nowrap' }}>
            {currentLabel}
          </h1>
          {topStats.length > 0 && (
            <div style={{ display:'flex', gap:'1rem', alignItems:'center',
              padding:'0 0.75rem', borderLeft:'1px solid rgba(255,255,255,.12)',
              borderRight:'1px solid rgba(255,255,255,.12)' }}>
              {topStats.map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontSize:'0.9rem', fontWeight:800, color:s.color }}>{s.value}</span>
                  <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,.45)', textTransform:'uppercase', fontWeight:600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', gap:'6px' }}>
            {[{label:'Market',sh:false,c:ACCENT},{label:'SH',sh:true,c:GREEN}].map(b => (
              <button key={b.label} onClick={() => setIsSH(b.sh)} style={{
                padding:'0.35rem 0.75rem', cursor:'pointer', fontWeight:700, fontSize:'0.78rem',
                borderRadius:'8px', transition:'all .15s',
                border:`1.5px solid ${isSH===b.sh ? b.c : 'rgba(255,255,255,0.25)'}`,
                background: isSH===b.sh ? b.c : 'transparent',
                color: isSH===b.sh ? '#fff' : 'rgba(255,255,255,0.55)',
              }}>{b.label}</button>
            ))}
          </div>
          <button onClick={() => window.location.reload()}
            style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.5)',
              cursor:'pointer', fontSize:'1.3rem', lineHeight:1, padding:'0 0.25rem' }}>↻</button>
        </header>

        <main style={{ flex:1, overflow:'auto', padding:'1.5rem 2rem' }}>
          <ShopContext.Provider value={{ isSH, setIsSH, topStats, setTopStats }}>
            <Outlet context={{ user, isAdmin }} />
          </ShopContext.Provider>
        </main>
      </div>
    </div>
  );
}
