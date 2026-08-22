import { useState, memo } from "react";
import type { CatalogNode } from "../hooks/useCatalogTree";
import { NODE_ICONS, NODE_LABELS } from "../services/catalogService";

const CHILD_TYPES: Record<string, string> = {
  department:  "category",
  category:    "subcategory",
  subcategory: "node",
  node:        "node",
};
const INDENT = 20;

interface Props {
  nodes:    CatalogNode[];
  isAdmin:  boolean;
  onAdd:    (parentId: string, name: string, type: string) => Promise<void>;
  onEdit:   (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, current: boolean) => Promise<void>;
  depth?:   number;
}

export default function CatalogTree({ nodes, isAdmin, onAdd, onEdit, onDelete, onToggle, depth = 0 }: Props) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <div>
      {nodes.map(node => (
        <CatalogNodeRow key={node.id} node={node} isAdmin={isAdmin}
          onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} depth={depth} />
      ))}
    </div>
  );
}

const CatalogNodeRow = memo(({ node, isAdmin, onAdd, onEdit, onDelete, onToggle, depth }: {
  node: CatalogNode; isAdmin: boolean; depth: number;
  onAdd: Props["onAdd"]; onEdit: Props["onEdit"]; onDelete: Props["onDelete"]; onToggle: Props["onToggle"];
}) => {
  const [open,       setOpen]       = useState(depth < 1);
  const [editMode,   setEditMode]   = useState(false);
  const [editName,   setEditName]   = useState(node.name);
  const [addMode,    setAddMode]    = useState(false);
  const [newName,    setNewName]    = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState<string|null>(null);

  const hasChildren = node.children && node.children.length > 0;
  const childType   = CHILD_TYPES[node.type] || "node";

  const handleEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true); setErr(null);
    try { await onEdit(node.id, editName.trim()); setEditMode(false); }
    catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true); setErr(null);
    try { await onAdd(node.id, newName.trim(), childType); setAddMode(false); setNewName(""); setOpen(true); }
    catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setErr(null);
    try { await onDelete(node.id); }
    catch(e:any) { setErr(e.message); setSaving(false); setDelConfirm(false); }
  };

  const btn = (color: string): React.CSSProperties => ({
    padding:"2px 8px", background:"transparent", border:`1px solid ${color}`,
    color, borderRadius:"5px", cursor:"pointer", fontSize:"0.72rem", fontWeight:600,
  });

  return (
    <div>
      <div style={{
        display:"flex", alignItems:"center", gap:"0.5rem",
        paddingTop:"0.45rem", paddingBottom:"0.45rem", paddingRight:"1rem",
        paddingLeft:`${depth * INDENT + 16}px`,
        borderBottom:"1px solid #F3F4F6",
        background: depth % 2 === 0 ? "#fff" : "#FAFAFA",
        opacity: node.is_active ? 1 : 0.5,
      }}>
        <button onClick={() => setOpen(o => !o)} style={{ background:"none", border:"none",
          cursor: hasChildren ? "pointer" : "default",
          color: hasChildren ? "var(--mute)" : "transparent", fontSize:"0.75rem", width:"16px", flexShrink:0 }}>
          {hasChildren ? (open ? "▼" : "▶") : "·"}
        </button>
        <span style={{ fontSize:"0.95rem", flexShrink:0 }}>{NODE_ICONS[node.type] || "📌"}</span>
        {node.image_url && <img src={node.image_url} alt="" style={{ width:"24px", height:"24px", borderRadius:"4px", objectFit:"cover", flexShrink:0 }} />}
        {editMode ? (
          <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
            onKeyDown={e => { if(e.key==="Enter") handleEdit(); if(e.key==="Escape") setEditMode(false); }}
            style={{ flex:1, padding:"2px 6px", border:"1px solid var(--brand-madre)", borderRadius:"4px", fontSize:"0.875rem", outline:"none" }} />
        ) : (
          <span onDoubleClick={() => isAdmin && setEditMode(true)} style={{
            flex:1, fontSize:"0.875rem",
            fontWeight: depth===0 ? 700 : depth===1 ? 600 : 400,
            color: node.is_active ? "#111" : "var(--gray-400)",
            textDecoration: node.is_active ? "none" : "line-through",
            cursor: isAdmin ? "text" : "default" }}>
            {node.name}
          </span>
        )}
        {hasChildren && <span style={{ fontSize:"0.7rem", color:"var(--gray-400)", flexShrink:0 }}>{node.children.length}</span>}
        {isAdmin && (
          <div style={{ display:"flex", gap:"0.3rem", flexShrink:0, marginLeft:"auto" }}>
            {editMode ? (
              <>
                <button onClick={handleEdit} disabled={saving} style={btn("color-mix(in srgb, var(--color-success) 70%, white)")}>✓</button>
                <button onClick={() => setEditMode(false)} style={btn("var(--gray-400)")}>✕</button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditMode(true); setEditName(node.name); }} style={btn("#3B82F6")}>✏️</button>
                {node.type !== "product" && (
                  <button onClick={() => setAddMode(a => !a)} style={btn("color-mix(in srgb, var(--color-success) 70%, white)")}>+ {NODE_LABELS[childType]?.substring(0,4)}</button>
                )}
                <button onClick={() => onToggle(node.id, node.is_active)} style={btn(node.is_active ? "#F59E0B" : "color-mix(in srgb, var(--color-success) 70%, white)")}>
                  {node.is_active ? "⏸" : "▶"}
                </button>
                {delConfirm ? (
                  <>
                    <button onClick={handleDelete} disabled={saving} style={{...btn("#EF4444"), background:"#EF4444", color:"#fff"}}>Confirmar</button>
                    <button onClick={() => setDelConfirm(false)} style={btn("var(--gray-400)")}>✕</button>
                  </>
                ) : (
                  <button onClick={() => setDelConfirm(true)} style={btn("#EF4444")}>🗑</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {err && <div style={{ paddingLeft:`${depth * INDENT + 48}px`, padding:"0.25rem 1rem", background:"#fef2f2", fontSize:"0.75rem", color:"#dc2626" }}>❌ {err}</div>}
      {addMode && isAdmin && (
        <div style={{ display:"flex", gap:"0.5rem", paddingLeft:`${(depth+1) * INDENT + 32}px`, padding:"0.4rem 1rem", background:"#FFF3EF", borderBottom:"1px solid #FFE0D0" }}>
          <span style={{ fontSize:"0.85rem" }}>{NODE_ICONS[childType]}</span>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={`Nuevo ${NODE_LABELS[childType]}...`}
            onKeyDown={e => { if(e.key==="Enter") handleAdd(); if(e.key==="Escape"){setAddMode(false);setNewName("");} }}
            style={{ flex:1, padding:"0.3rem 0.6rem", border:"1px solid var(--brand-madre)", borderRadius:"5px", fontSize:"0.85rem", outline:"none" }} />
          <button onClick={handleAdd} disabled={saving||!newName.trim()}
            style={{ padding:"0.3rem 0.75rem", background:saving?"#ccc":"var(--brand-madre)", color:"#fff", border:"none", borderRadius:"5px", cursor:"pointer", fontSize:"0.8rem", fontWeight:700 }}>
            {saving?"...":"Agregar"}
          </button>
          <button onClick={()=>{setAddMode(false);setNewName("");}}
            style={{ padding:"0.3rem 0.5rem", background:"transparent", border:"1px solid #ccc", borderRadius:"5px", cursor:"pointer", fontSize:"0.8rem" }}>✕</button>
        </div>
      )}
      {open && hasChildren && (
        <div style={{ borderLeft:`2px solid ${depth===0?"var(--brand-madre)":depth===1?"color-mix(in srgb, var(--color-success) 70%, white)":"var(--border)"}`, marginLeft:`${depth * INDENT + 24}px` }}>
          <CatalogTree nodes={node.children} isAdmin={isAdmin}
            onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} depth={depth + 1} />
        </div>
      )}
    </div>
  );
});


