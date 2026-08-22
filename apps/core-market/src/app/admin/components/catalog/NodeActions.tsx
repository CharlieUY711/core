import { useState } from "react";

interface Props {
  node:      any;
  isAdmin:   boolean;
  onEdit:    () => void;
  onDelete:  () => void;
  onAdd:     () => void;
  childType: string;
}

export default function NodeActions({ node, isAdmin, onEdit, onDelete, onAdd, childType }: Props) {
  const [delConfirm, setDelConfirm] = useState(false);
  if (!isAdmin) return null;

  return (
    <div className="node-actions" style={{ display:"flex", gap:"0.3rem", opacity:0, transition:"opacity 0.15s" }}>
      <Btn color="var(--mute)" onClick={onEdit} title="Editar">✏️</Btn>
      {node.type !== "product" && (
        <Btn color="color-mix(in srgb, var(--color-success) 70%, white)" onClick={onAdd} title={`+ ${childType}`}>+</Btn>
      )}
      {delConfirm ? (
        <>
          <Btn color="#EF4444" bg="#EF4444" textColor="#fff" onClick={onDelete}>✓</Btn>
          <Btn color="var(--gray-400)" onClick={() => setDelConfirm(false)}>✕</Btn>
        </>
      ) : (
        <Btn color="#EF4444" onClick={() => setDelConfirm(true)}>🗑</Btn>
      )}
    </div>
  );
}

function Btn({ color, bg, textColor, onClick, title, children }: any) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }} title={title}
      style={{ padding:"2px 7px", background: bg||"transparent", border:`1px solid ${color}`,
        color: textColor||color, borderRadius:"5px", cursor:"pointer", fontSize:"0.72rem",
        fontWeight:600, transition:"all 0.12s" }}>
      {children}
    </button>
  );
}


