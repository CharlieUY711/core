import { useState, useEffect, useCallback, memo } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";

interface Depto  { id:string; nombre:string; color:string; activo:boolean; orden:number; }
interface Cat    { id:string; nombre:string; departamento_id:string; activo:boolean; }
interface SubCat { id:string; nombre:string; categoria_id:string; activo:boolean; }

export default function AdminCatalog() {
  const { isAdmin } = useOutletContext<any>() || {};
  const [deptos,   setDeptos]   = useState<Depto[]>([]);
  const [cats,     setCats]     = useState<Cat[]>([]);
  const [subcats,  setSubcats]  = useState<SubCat[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [expandAll,setExpandAll]= useState(false);
  const [toast,    setToast]    = useState<{text:string;ok:boolean}|null>(null);

  const notify = (text:string, ok=true) => {
    setToast({text,ok}); setTimeout(()=>setToast(null),2800);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [d,c,s] = await Promise.all([
      supabase.from("departamentos").select("*").order("orden", {ascending:true, nullsFirst:false}),
      supabase.from("categorias").select("*").order("orden", {ascending:true, nullsFirst:false}),
      supabase.from("subcategorias").select("*").order("orden", {ascending:true, nullsFirst:false}),
    ]);
    setDeptos(d.data || []);
    setCats(c.data || []);
    setSubcats(s.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  // ── CRUD Departamentos
  const addDepto    = async (nombre:string) => { await supabase.from("departamentos").insert({nombre,color:"#FF6835",activo:true,orden:deptos.length+1}); notify(`${nombre} creado ✓`); load(); };
  const editDepto   = async (id:string, nombre:string) => { await supabase.from("departamentos").update({nombre}).eq("id",id); notify("Actualizado ✓"); load(); };
  const deleteDepto = async (id:string) => {
    if (cats.some(c=>c.departamento_id===id)) { notify("Tiene categorías — eliminá primero",false); return; }
    await supabase.from("departamentos").delete().eq("id",id); notify("Eliminado"); load();
  };
  const toggleDepto = async (id:string, activo:boolean) => { await supabase.from("departamentos").update({activo:!activo}).eq("id",id); load(); };

  // ── CRUD Categorias
  const addCat    = async (departamento_id:string, nombre:string) => { await supabase.from("categorias").insert({nombre,departamento_id,activo:true}); notify(`${nombre} creado ✓`); load(); };
  const editCat   = async (id:string, nombre:string) => { await supabase.from("categorias").update({nombre}).eq("id",id); notify("Actualizado ✓"); load(); };
  const deleteCat = async (id:string) => {
    if (subcats.some(s=>s.categoria_id===id)) { notify("Tiene subcategorías — eliminá primero",false); return; }
    await supabase.from("categorias").delete().eq("id",id); notify("Eliminado"); load();
  };

  // ── CRUD Subcategorias
  const addSubCat    = async (categoria_id:string, nombre:string) => { await supabase.from("subcategorias").insert({nombre,categoria_id,activo:true}); notify(`${nombre} creado ✓`); load(); };
  const editSubCat   = async (id:string, nombre:string) => { await supabase.from("subcategorias").update({nombre}).eq("id",id); notify("Actualizado ✓"); load(); };
  const deleteSubCat = async (id:string) => { await supabase.from("subcategorias").delete().eq("id",id); notify("Eliminado"); load(); };

  const filteredDeptos = deptos.filter(d =>
    !search ||
    d.nombre.toLowerCase().includes(search.toLowerCase()) ||
    cats.filter(c=>c.departamento_id===d.id).some(c=>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      subcats.filter(s=>s.categoria_id===c.id).some(s=>s.nombre.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const totalCats    = cats.length;
  const totalSubcats = subcats.length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>

      {toast && (
        <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:9999,
          padding:"0.75rem 1.25rem",borderRadius:"10px",fontWeight:600,fontSize:"0.875rem",
          background:toast.ok?"#f0fdf4":"#fef2f2",color:toast.ok?"#166534":"#dc2626",
          border:`1px solid ${toast.ok?"color-mix(in srgb, var(--color-success) 70%, white)":"#ef4444"}`,boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
          {toast.ok?"✅":"❌"} {toast.text}
        </div>
      )}

      {/* Toolbar */}
      <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <span style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:"var(--gray-400)"}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar en el catálogo..."
            style={{width:"100%",padding:"0.55rem 0.75rem 0.55rem 2.25rem",border:"1.5px solid var(--border)",
              borderRadius:"10px",fontSize:"0.875rem",outline:"none",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
            onBlur={e=>e.target.style.borderColor="var(--border)"} />
        </div>
        <button onClick={()=>setExpandAll(e=>!e)}
          style={{padding:"0.55rem 1rem",background:expandAll?"var(--brand-madre)":"#fff",
            color:expandAll?"#fff":"var(--mute)",border:"1.5px solid var(--border)",
            borderRadius:"10px",cursor:"pointer",fontSize:"0.85rem",fontWeight:600,
            transition:"all 0.15s",whiteSpace:"nowrap"}}>
          {expandAll?"⬆ Colapsar todo":"⬇ Expandir todo"}
        </button>
        <button onClick={load}
          style={{padding:"0.55rem 0.75rem",background:"#fff",border:"1.5px solid var(--border)",
            borderRadius:"10px",cursor:"pointer",fontSize:"1rem",color:"var(--mute)"}}>↻</button>
        {isAdmin && <AddRootForm onAdd={addDepto} />}
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:"0.75rem"}}>
        {[
          {label:"Departamentos",value:deptos.length,    color:"#3B82F6"},
          {label:"Categorías",   value:totalCats,        color:"#8B5CF6"},
          {label:"Subcategorías",value:totalSubcats,     color:"#06B6D4"},
          {label:"Activos",      value:deptos.filter(d=>d.activo).length, color:"color-mix(in srgb, var(--color-success) 70%, white)"},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",borderRadius:"10px",padding:"0.65rem 1rem",
            borderLeft:`4px solid ${s.color}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
            display:"flex",gap:"0.6rem",alignItems:"center"}}>
            <span style={{fontWeight:800,fontSize:"1.15rem",color:s.color}}>{s.value}</span>
            <span style={{fontSize:"0.75rem",color:"var(--mute)"}}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tree */}
      <div style={{background:"#fff",borderRadius:"14px",overflow:"hidden",
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #F3F4F6"}}>
        {loading ? (
          <div style={{padding:"4rem",textAlign:"center"}}>
            {[280,220,180,240].map((w,i)=>(
              <div key={i} style={{height:"40px",background:"#F3F4F6",borderRadius:"8px",
                width:`${w}px`,margin:"5px auto",animation:"pulse 1.5s ease-in-out infinite"}} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        ) : filteredDeptos.length === 0 ? (
          <div style={{padding:"4rem",textAlign:"center"}}>
            <div style={{fontSize:"3rem",marginBottom:"0.75rem"}}>{search?"🔍":"🌱"}</div>
            <div style={{fontWeight:700,color:"#374151"}}>{search?`Sin resultados para "${search}"`:"Catálogo vacío"}</div>
          </div>
        ) : filteredDeptos.map(d=>(
          <DeptoNode key={d.id} depto={d}
            cats={cats.filter(c=>c.departamento_id===d.id)}
            subcats={subcats}
            isAdmin={!!isAdmin}
            expandAll={expandAll}
            onEditDepto={editDepto} onDeleteDepto={deleteDepto} onToggleDepto={toggleDepto}
            onAddCat={addCat} onEditCat={editCat} onDeleteCat={deleteCat}
            onAddSubCat={addSubCat} onEditSubCat={editSubCat} onDeleteSubCat={deleteSubCat}
          />
        ))}
      </div>
    </div>
  );
}

// ── Botón agregar departamento raíz
function AddRootForm({onAdd}:{onAdd:(n:string)=>void}) {
  const [show,setShow]=useState(false);
  const [name,setName]=useState("");
  const handle=async()=>{ if(!name.trim()) return; await onAdd(name.trim()); setName(""); setShow(false); };
  return show?(
    <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
      <span>🏢</span>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)}
        placeholder="Nuevo departamento..."
        onKeyDown={e=>{if(e.key==="Enter")handle();if(e.key==="Escape"){setShow(false);setName("");}}}
        style={{padding:"0.45rem 0.75rem",border:"1.5px solid var(--brand-madre)",borderRadius:"8px",fontSize:"0.875rem",outline:"none",width:"200px"}} />
      <Btn color="var(--brand-madre)" bg="var(--brand-madre)" textColor="#fff" onClick={handle}>Crear</Btn>
      <Btn color="#D1D5DB" onClick={()=>{setShow(false);setName("");}}>✕</Btn>
    </div>
  ):(
    <button onClick={()=>setShow(true)}
      style={{padding:"0.55rem 1.25rem",background:"var(--brand-madre)",color:"#fff",border:"none",
        borderRadius:"10px",cursor:"pointer",fontWeight:700,fontSize:"0.875rem",whiteSpace:"nowrap"}}>
      + Departamento
    </button>
  );
}

// ── Nodo Departamento
const DeptoNode = memo(({depto,cats,subcats,isAdmin,expandAll,onEditDepto,onDeleteDepto,onToggleDepto,onAddCat,onEditCat,onDeleteCat,onAddSubCat,onEditSubCat,onDeleteSubCat}:any) => {
  const [open,setOpen]=useState(true);
  const [editing,setEditing]=useState(false);
  const [editName,setEditName]=useState(depto.nombre);
  const [addingCat,setAddingCat]=useState(false);
  const [newCat,setNewCat]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  const [hovered,setHovered]=useState(false);

  useEffect(()=>setOpen(expandAll),[expandAll]);

  const doEdit=async()=>{ if(!editName.trim()||editName===depto.nombre){setEditing(false);return;} await onEditDepto(depto.id,editName.trim()); setEditing(false); };
  const doAddCat=async()=>{ if(!newCat.trim()) return; await onAddCat(depto.id,newCat.trim()); setNewCat(""); setAddingCat(false); };

  return (
    <div>
      <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.65rem 1rem",
          borderBottom:"1px solid #F3F4F6",background:hovered?"#FAFAFA":"var(--gray-50)",
          opacity:depto.activo?1:0.5}}>

        {/* Botón expand */}
        <button onClick={()=>setOpen(o=>!o)}
          style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",
            fontSize:"0.7rem",width:"16px",flexShrink:0,transition:"transform 0.15s",
            transform:open?"rotate(90deg)":"rotate(0deg)"}}>▶</button>

        <span style={{fontSize:"1rem",flexShrink:0}}>🏢</span>

        {editing?(
          <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus
            onKeyDown={e=>{if(e.key==="Enter")doEdit();if(e.key==="Escape")setEditing(false);}}
            onClick={e=>e.stopPropagation()}
            style={{flex:1,padding:"2px 6px",border:"1.5px solid var(--brand-madre)",borderRadius:"5px",fontSize:"0.9rem",outline:"none"}} />
        ):(
          <span onDoubleClick={()=>isAdmin&&setEditing(true)}
            style={{flex:1,fontWeight:700,fontSize:"0.9rem",
              color:depto.activo?"#111":"var(--gray-400)",
              textDecoration:depto.activo?"none":"line-through"}}>
            {depto.nombre}
          </span>
        )}

        <span style={{fontSize:"0.72rem",color:"#CBD5E1",flexShrink:0}}>{cats.length} cats</span>

        {isAdmin&&(hovered||editing)&&(
          <div style={{display:"flex",gap:"0.25rem",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            {editing?(<>
              <Btn color="color-mix(in srgb, var(--color-success) 70%, white)" onClick={doEdit}>✓</Btn>
              <Btn color="var(--gray-400)" onClick={()=>setEditing(false)}>✕</Btn>
            </>):(<>
              <Btn color="#3B82F6" onClick={()=>{setEditing(true);setEditName(depto.nombre);}}>✏️</Btn>
              <Btn color="color-mix(in srgb, var(--color-success) 70%, white)" onClick={()=>{setAddingCat(a=>!a);setOpen(true);}}>+Cat</Btn>
              <Btn color={depto.activo?"#F59E0B":"color-mix(in srgb, var(--color-success) 70%, white)"} onClick={()=>onToggleDepto(depto.id,depto.activo)}>{depto.activo?"⏸":"▶"}</Btn>
              {delConfirm?(<>
                <Btn color="#EF4444" bg="#EF4444" textColor="#fff" onClick={()=>onDeleteDepto(depto.id)}>Confirmar</Btn>
                <Btn color="var(--gray-400)" onClick={()=>setDelConfirm(false)}>✕</Btn>
              </>):(<Btn color="#EF4444" onClick={()=>setDelConfirm(true)}>🗑</Btn>)}
            </>)}
          </div>
        )}
      </div>

      {addingCat&&isAdmin&&(
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center",
          padding:"0.35rem 1rem 0.35rem 2.5rem",background:"#FFF8F5",borderBottom:"1px solid #FFE4CC"}}>
          <span>📂</span>
          <input autoFocus value={newCat} onChange={e=>setNewCat(e.target.value)}
            placeholder="Nueva categoría..."
            onKeyDown={e=>{if(e.key==="Enter")doAddCat();if(e.key==="Escape"){setAddingCat(false);setNewCat("");}}}
            style={{flex:1,padding:"0.3rem 0.6rem",border:"1.5px solid var(--brand-madre)",borderRadius:"6px",fontSize:"0.85rem",outline:"none",maxWidth:"260px"}} />
          <Btn color="var(--brand-madre)" bg="var(--brand-madre)" textColor="#fff" onClick={doAddCat}>Agregar</Btn>
          <Btn color="#D1D5DB" onClick={()=>{setAddingCat(false);setNewCat("");}}>✕</Btn>
        </div>
      )}

      {open&&(
        <div style={{borderLeft:"3px solid var(--brand-madre)25",marginLeft:"32px"}}>
          {cats.length===0?(
            <div style={{padding:"0.6rem 1rem",color:"var(--gray-400)",fontSize:"0.8rem",fontStyle:"italic"}}>
              Sin categorías {isAdmin?"— usá +Cat":""}
            </div>
          ):cats.map(cat=>(
            <CatNode key={cat.id} cat={cat}
              subcats={subcats.filter(s=>s.categoria_id===cat.id)}
              isAdmin={isAdmin} expandAll={expandAll}
              onEdit={onEditCat} onDelete={onDeleteCat}
              onAddSubCat={onAddSubCat} onEditSubCat={onEditSubCat} onDeleteSubCat={onDeleteSubCat}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Nodo Categoría
const CatNode = memo(({cat,subcats,isAdmin,expandAll,onEdit,onDelete,onAddSubCat,onEditSubCat,onDeleteSubCat}:any) => {
  const [open,setOpen]=useState(true);
  const [editing,setEditing]=useState(false);
  const [editName,setEditName]=useState(cat.nombre);
  const [addingSub,setAddingSub]=useState(false);
  const [newSub,setNewSub]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  const [hovered,setHovered]=useState(false);

  useEffect(()=>setOpen(expandAll),[expandAll]);

  const doEdit=async()=>{ if(!editName.trim()||editName===cat.nombre){setEditing(false);return;} await onEdit(cat.id,editName.trim()); setEditing(false); };
  const doAddSub=async()=>{ if(!newSub.trim()) return; await onAddSubCat(cat.id,newSub.trim()); setNewSub(""); setAddingSub(false); };

  return (
    <div>
      <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.5rem 1rem",
          borderBottom:"1px solid var(--gray-50)",background:hovered?"#FAFAFA":"#fff"}}>

        <button onClick={()=>setOpen(o=>!o)}
          style={{background:"none",border:"none",cursor:"pointer",color:"#C4B5FD",
            fontSize:"0.65rem",width:"14px",flexShrink:0,transition:"transform 0.15s",
            transform:open?"rotate(90deg)":"rotate(0deg)"}}>
          {subcats.length>0?"▶":"·"}
        </button>

        <span style={{fontSize:"0.9rem",flexShrink:0}}>📂</span>

        {editing?(
          <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus
            onKeyDown={e=>{if(e.key==="Enter")doEdit();if(e.key==="Escape")setEditing(false);}}
            style={{flex:1,padding:"2px 6px",border:"1.5px solid #8B5CF6",borderRadius:"5px",fontSize:"0.875rem",outline:"none"}} />
        ):(
          <span onDoubleClick={()=>isAdmin&&setEditing(true)}
            style={{flex:1,fontSize:"0.875rem",color:"#374151"}}>
            {cat.nombre}
          </span>
        )}

        <span style={{padding:"1px 6px",borderRadius:"20px",fontSize:"0.62rem",fontWeight:700,
          background:"#8B5CF618",color:"#8B5CF6",flexShrink:0}}>Cat</span>

        {subcats.length>0&&<span style={{fontSize:"0.7rem",color:"#CBD5E1",flexShrink:0}}>{subcats.length}</span>}

        {isAdmin&&(hovered||editing)&&(
          <div style={{display:"flex",gap:"0.25rem",flexShrink:0}}>
            {editing?(<>
              <Btn color="color-mix(in srgb, var(--color-success) 70%, white)" onClick={doEdit}>✓</Btn>
              <Btn color="var(--gray-400)" onClick={()=>setEditing(false)}>✕</Btn>
            </>):(<>
              <Btn color="#3B82F6" onClick={()=>{setEditing(true);setEditName(cat.nombre);}}>✏️</Btn>
              <Btn color="#06B6D4" onClick={()=>{setAddingSub(a=>!a);setOpen(true);}}>+Sub</Btn>
              {delConfirm?(<>
                <Btn color="#EF4444" bg="#EF4444" textColor="#fff" onClick={()=>onDelete(cat.id)}>Confirmar</Btn>
                <Btn color="var(--gray-400)" onClick={()=>setDelConfirm(false)}>✕</Btn>
              </>):(<Btn color="#EF4444" onClick={()=>setDelConfirm(true)}>🗑</Btn>)}
            </>)}
          </div>
        )}
      </div>

      {addingSub&&isAdmin&&(
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center",
          padding:"0.35rem 1rem 0.35rem 3.5rem",background:"#F0FDFA",borderBottom:"1px solid #99F6E4"}}>
          <span>📁</span>
          <input autoFocus value={newSub} onChange={e=>setNewSub(e.target.value)}
            placeholder="Nueva subcategoría..."
            onKeyDown={e=>{if(e.key==="Enter")doAddSub();if(e.key==="Escape"){setAddingSub(false);setNewSub("");}}}
            style={{flex:1,padding:"0.3rem 0.6rem",border:"1.5px solid #06B6D4",borderRadius:"6px",fontSize:"0.85rem",outline:"none",maxWidth:"260px"}} />
          <Btn color="#06B6D4" bg="#06B6D4" textColor="#fff" onClick={doAddSub}>Agregar</Btn>
          <Btn color="#D1D5DB" onClick={()=>{setAddingSub(false);setNewSub("");}}>✕</Btn>
        </div>
      )}

      {open&&subcats.length>0&&(
        <div style={{borderLeft:"3px solid #06B6D425",marginLeft:"32px"}}>
          {subcats.map((sub:any)=>(
            <SubCatNode key={sub.id} sub={sub} isAdmin={isAdmin}
              onEdit={onEditSubCat} onDelete={onDeleteSubCat} />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Nodo Subcategoría
const SubCatNode = memo(({sub,isAdmin,onEdit,onDelete}:any) => {
  const [editing,setEditing]=useState(false);
  const [editName,setEditName]=useState(sub.nombre);
  const [delConfirm,setDelConfirm]=useState(false);
  const [hovered,setHovered]=useState(false);

  const doEdit=async()=>{ if(!editName.trim()||editName===sub.nombre){setEditing(false);return;} await onEdit(sub.id,editName.trim()); setEditing(false); };

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.45rem 1rem",
        borderBottom:"1px solid var(--gray-50)",background:hovered?"#F0FDFA":"#fff"}}>

      <span style={{fontSize:"0.75rem",color:"#CBD5E1",width:"14px",flexShrink:0}}>·</span>
      <span style={{fontSize:"0.85rem",flexShrink:0}}>📁</span>

      {editing?(
        <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus
          onKeyDown={e=>{if(e.key==="Enter")doEdit();if(e.key==="Escape")setEditing(false);}}
          style={{flex:1,padding:"2px 6px",border:"1.5px solid #06B6D4",borderRadius:"5px",fontSize:"0.85rem",outline:"none"}} />
      ):(
        <span onDoubleClick={()=>isAdmin&&setEditing(true)}
          style={{flex:1,fontSize:"0.85rem",color:"var(--mute)"}}>
          {sub.nombre}
        </span>
      )}

      <span style={{padding:"1px 6px",borderRadius:"20px",fontSize:"0.6rem",fontWeight:700,
        background:"#06B6D418",color:"#06B6D4",flexShrink:0}}>Sub</span>

      {isAdmin&&(hovered||editing)&&(
        <div style={{display:"flex",gap:"0.25rem",flexShrink:0}}>
          {editing?(<>
            <Btn color="color-mix(in srgb, var(--color-success) 70%, white)" onClick={doEdit}>✓</Btn>
            <Btn color="var(--gray-400)" onClick={()=>setEditing(false)}>✕</Btn>
          </>):(<>
            <Btn color="#3B82F6" onClick={()=>{setEditing(true);setEditName(sub.nombre);}}>✏️</Btn>
            {delConfirm?(<>
              <Btn color="#EF4444" bg="#EF4444" textColor="#fff" onClick={()=>onDelete(sub.id)}>Confirmar</Btn>
              <Btn color="var(--gray-400)" onClick={()=>setDelConfirm(false)}>✕</Btn>
            </>):(<Btn color="#EF4444" onClick={()=>setDelConfirm(true)}>🗑</Btn>)}
          </>)}
        </div>
      )}
    </div>
  );
});

function Btn({color,bg,textColor,onClick,children}:any) {
  return (
    <button onClick={e=>{e.stopPropagation();onClick();}}
      style={{padding:"2px 7px",background:bg||"transparent",border:`1px solid ${color}`,
        color:textColor||color,borderRadius:"5px",cursor:"pointer",fontSize:"0.7rem",fontWeight:600}}>
      {children}
    </button>
  );
}



