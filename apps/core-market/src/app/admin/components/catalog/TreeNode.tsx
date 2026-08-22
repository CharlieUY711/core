import { useState, memo } from "react";
import NodeActions from "./NodeActions";
import type { CatalogNode } from "../../hooks/useCatalogTree";

const CHILD_TYPES: Record<string, string> = {
  department: "category", category: "subcategory",
  subcategory: "node",    node: "node",
};

const TYPE_STYLE: Record<string, { icon: string; badge: string; bColor: string }> = {
  department:  { icon:"🏢", badge:"Depto",     bColor:"#3B82F6" },
  category:    { icon:"📂", badge:"Categoría", bColor:"#8B5CF6" },
  subcategory: { icon:"📁", badge:"Subcat",    bColor:"#06B6D4" },
  node:        { icon:"📌", badge:"Nodo",      bColor:"#F59E0B" },
  product:     { icon:"📦", badge:"Producto",  bColor:"color-mix(in srgb, var(--color-success) 70%, white)" },
};

const INDENT = 24;

interface Props {
  node:        CatalogNode;
  depth:       number;
  isAdmin:     boolean;
  defaultOpen?: boolean;
  onAdd:       (parentId:string, name:string, type:string) => Promise<void>;
  onEdit:      (id:string, name:string) => Promise<void>;
  onDelete:    (id:string) => Promise<void>;
  onToggle:    (id:string, current:boolean) => Promise<void>;
}

const TreeNode = memo(({ node, depth, isAdmin, defaultOpen=false, onAdd, onEdit, onDelete, onToggle }: Props) => {
  const [open,     setOpen]     = useState(defaultOpen || depth < 1);
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [adding,   setAdding]   = useState(false);
  const [newName,  setNewName]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const hasKids  = node.children?.length > 0;
  const childType = CHILD_TYPES[node.type] || "node";
  const ts = TYPE_STYLE[node.type] || TYPE_STYLE.node;

  const doEdit = async () => {
    if (!editName.trim() || editName === node.name) { setEditing(false); return; }
    setSaving(true);
    await onEdit(node.id, editName.trim());
    setEditing(false); setSaving(false);
  };

  const doAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await onAdd(node.id, newName.trim(), childType);
    setNewName(""); setAdding(false); setOpen(true); setSaving(false);
  };

  return (
    <div>
      {/* ── Row ── */}
      <div
        className="tree-node-row"
        onClick={() => hasKids && setOpen(o=>!o)}
        style={{
          display:"flex", alignItems:"center", gap:"0.5rem",
          padding:`0.4rem 1rem 0.4rem ${depth * INDENT + 12}px`,
          cursor: hasKids ? "pointer" : "default",
          borderBottom:"1px solid #F3F4F6",
          background: depth===0 ? "var(--gray-50)" : depth===1 ? "#fff" : "#FCFCFC",
          opacity: node.is_active ? 1 : 0.45,
          transition:"background 0.1s",
          position:"relative",
        }}
        onMouseEnter={e => {
          const actions = e.currentTarget.querySelector<HTMLElement>(".node-actions");
          if (actions) actions.style.opacity = "1";
        }}
        onMouseLeave={e => {
          const actions = e.currentTarget.querySelector<HTMLElement>(".node-actions");
          if (actions) actions.style.opacity = "0";
        }}>

        {/* Expand icon */}
        <span style={{ fontSize:"0.65rem", color:"#D1D5DB", width:"12px", flexShrink:0, transition:"transform 0.15s",
          transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          {hasKids ? "▶" : "·"}
        </span>

        {/* Type icon */}
        <span style={{ fontSize:"1rem", flexShrink:0 }}>{ts.icon}</span>

        {/* Image */}
        {node.image_url && (
          <img src={node.image_url} alt="" style={{ width:"22px", height:"22px", borderRadius:"4px", objectFit:"cover", flexShrink:0 }} />
        )}

        {/* Name / inline edit */}
        {editing ? (
          <input
            autoFocus value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter") doEdit(); if(e.key==="Escape") setEditing(false); }}
            onClick={e => e.stopPropagation()}
            style={{ flex:1, padding:"2px 6px", border:"1.5px solid var(--brand-madre)", borderRadius:"5px",
              fontSize:"0.875rem", outline:"none", maxWidth:"260px" }}
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); if(isAdmin){ setEditing(true); setEditName(node.name); } }}
            style={{ flex:1, fontSize: depth===0?"0.95rem":"0.875rem",
              fontWeight: depth===0?700:depth===1?600:400,
              color: node.is_active?"#111":"var(--gray-400)",
              textDecoration: node.is_active?"none":"line-through" }}>
            {node.name}
          </span>
        )}

        {/* Badges */}
        <span style={{ padding:"1px 7px", borderRadius:"20px", fontSize:"0.65rem", fontWeight:700,
          background:`${ts.bColor}18`, color:ts.bColor, flexShrink:0 }}>
          {ts.badge}
        </span>

        {hasKids && (
          <span style={{ fontSize:"0.7rem", color:"#CBD5E1", flexShrink:0 }}>{node.children.length}</span>
        )}

        {/* Actions — fade on hover */}
        <NodeActions node={node} isAdmin={isAdmin}
          childType={childType}
          onEdit={() => { setEditing(true); setEditName(node.name); }}
          onAdd={() => { setAdding(a=>!a); setOpen(true); }}
          onDelete={async () => { await onDelete(node.id); }}
        />
      </div>

      {/* ── Add child form ── */}
      {adding && isAdmin && (
        <div style={{ display:"flex", gap:"0.5rem", alignItems:"center",
          padding:`0.35rem 1rem 0.35rem ${(depth+1)*INDENT+12}px`,
          background:"#FFF8F5", borderBottom:"1px solid #FFE4CC" }}>
          <span style={{ fontSize:"0.85rem" }}>{TYPE_STYLE[childType]?.icon}</span>
          <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder={`Nuevo ${childType}...`}
            onKeyDown={e=>{ if(e.key==="Enter") doAdd(); if(e.key==="Escape"){setAdding(false);setNewName("");} }}
            onClick={e=>e.stopPropagation()}
            style={{ flex:1, padding:"0.3rem 0.6rem", border:"1.5px solid var(--brand-madre)",
              borderRadius:"6px", fontSize:"0.85rem", outline:"none", maxWidth:"280px" }} />
          <button onClick={e=>{e.stopPropagation();doAdd();}} disabled={saving||!newName.trim()}
            style={{ padding:"0.3rem 0.75rem", background:saving?"#ccc":"var(--brand-madre)", color:"#fff",
              border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"0.8rem", fontWeight:700 }}>
            {saving?"...":"Agregar"}
          </button>
          <button onClick={e=>{e.stopPropagation();setAdding(false);setNewName("");}}
            style={{ padding:"0.3rem 0.5rem", background:"transparent", border:"1px solid #D1D5DB",
              borderRadius:"6px", cursor:"pointer", fontSize:"0.8rem", color:"var(--mute)" }}>✕</button>
        </div>
      )}

      {/* ── Children ── */}
      {open && hasKids && (
        <div style={{ borderLeft:`2px solid ${depth===0?"var(--brand-madre)40":depth===1?"#8B5CF620":"var(--border)"}`,
          marginLeft:`${depth*INDENT+20}px` }}>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth+1} isAdmin={isAdmin}
              onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
});

export default TreeNode;


