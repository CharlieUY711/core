import { useEditorStore } from "../engine/useEditorStore";

export default function OriginalCanvas() {
  const store = useEditorStore();
  const dataUrl = store.originalDataUrl;

  const loadFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      const img = new Image();
      img.onload = () => store.setSrc(img, url, f.name);
      img.src = url;
    };
    reader.readAsDataURL(f);
  };

  return (
    <div
      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:"12px", position:"relative" }}
      onDragOver={e => { e.preventDefault(); e.currentTarget.style.outline = "2px dashed var(--brand-madre)"; }}
      onDragLeave={e => { e.currentTarget.style.outline = ""; }}
      onDrop={e => { e.preventDefault(); e.currentTarget.style.outline = ""; const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) loadFile(f); }}
    >
      {dataUrl ? (
        <>
          <img
            src={dataUrl}
            alt="original"
            style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:"6px", display:"block" }}
          />
          {store.versionCount > 0 && (
            <div style={{ position:"absolute", top:"8px", right:"8px", background:"var(--color-success)", color:"#fff", fontSize:"10px", fontWeight:700, padding:"2px 8px", borderRadius:"20px" }}>
              V{store.versionCount}
            </div>
          )}
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", color:"#888", cursor:"pointer" }}
          onClick={() => document.getElementById("emi-file-input")?.click()}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <path d="m8 12 4-4 4 4M12 8v8"/>
          </svg>
          <p style={{ fontSize:"13px", textAlign:"center", lineHeight:1.6 }}>
            Arrastra o hace click<br/>para cargar una imagen
          </p>
          <button
            style={{ background:"var(--brand-madre)", color:"#fff", border:"none", borderRadius:"8px", padding:"8px 20px", fontSize:"13px", fontWeight:500, cursor:"pointer" }}
            onClick={e => { e.stopPropagation(); document.getElementById("emi-file-input")?.click(); }}>
            Subir imagen
          </button>
        </div>
      )}
      <input id="emi-file-input" type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
    </div>
  );
}

