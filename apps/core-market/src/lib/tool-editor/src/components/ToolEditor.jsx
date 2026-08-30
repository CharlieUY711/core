/**
 * ToolEditor — Editor de imágenes profesional
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor
 *
 * BUGS CORREGIDOS v1.1:
 *  1. saveSnap usaba histIdx stale en closures async → ahora usa histRef (useRef)
 *  2. renderCanvas() redibujaba desde imgEl ya modificado → separado cleanImgRef (imagen base limpia)
 *  3. filtro CSS en <canvas> no se exportaba → filtro se hornea en píxeles al exportar
 *  4. shadows / highlights no implementados → implementados con curva de luminancia
 *  5. sharpness / clarity / noise no implementados → implementados con kernels reales
 */

import { useRef, useEffect, useCallback } from "react";
import { S, FILTERS, TOOLS, ASPECT_PRESETS, SOCIAL_PRESETS } from "../design/designSystem.js";
import { useEditorState } from "../state/useEditorState.js";
import { ToolEditorErrorBoundary } from "../lifecycle/useEditorLifecycle.jsx";
import { validateConfig } from "../contract/toolContract.js";
import { applyPixelAdjustments,
  bakeFilterToPixels,
  estimateFileSize,
  removeBackgroundAI as engineRemoveBgAI,
  removeBackgroundFallback,
} from "./effects/effectsEngine.js";
import EffectsPanel from "./effects/EffectsPanel.jsx";

// ─── Constantes — importadas desde designSystem ───────────────────────────────
// FILTERS, TOOLS, ASPECT_PRESETS, SOCIAL_PRESETS, ADJ_DEFAULTS → designSystem.js



// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SliderRow({ label, id, min=-100, max=100, value, onChange }) {
  const pct   = ((value - min) / (max - min)) * 100;
  const color = value !== 0 ? "#1A4F9C" : "#C8D5E8";
  const track = `linear-gradient(to right, ${color} ${pct}%, #E8EDF5 ${pct}%)`;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
      <span style={{ fontSize:11, color:"#7A7A7A", width:76, flexShrink:0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(id, parseInt(e.target.value))}
        style={{ flex:1, accentColor:color, cursor:"pointer",
                 background:track, borderRadius:4, height:3,
                 WebkitAppearance:"none", appearance:"none" }} />
      <span style={{ fontSize:11, color:color, width:28, textAlign:"right", flexShrink:0, fontWeight:600 }}>{value}</span>
    </div>
  );
}

function SectionHeader({ label, onReset }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, marginTop:12 }}>
      <span style={{ fontSize:9, letterSpacing:1.5, color:"#444", textTransform:"uppercase" }}>{label}</span>
      {onReset && (
        <button onClick={onReset} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:9, padding:"2px 4px" }}>
          reset
        </button>
      )}
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div style={{ fontSize:10, color:"#3a3a3a", display:"flex", gap:4 }}>
      {label}: <span style={{ color:"#666" }}>{value}</span>
    </div>
  );
}

function FilterThumb({ filter, active, imgEl, onClick }) {
  const ref = useRef();
  useEffect(() => {
    if (!imgEl || !ref.current) return;
    const c = ref.current;
    c.width = 60; c.height = 46;
    c.getContext("2d").drawImage(imgEl, 0, 0, 60, 46);
  }, [imgEl]);
  return (
    <div onClick={onClick} style={{
      background:"#f5f5f3", border:`1.5px solid ${active?"#00d4aa":"#ddd"}`,
      borderRadius:5, cursor:"pointer", overflow:"hidden", transition:"border-color .15s",
      boxShadow: active ? "0 0 0 1px #00d4aa" : "none",
    }}>
      <canvas ref={ref} style={{ width:"100%", height:46, display:"block", filter:filter.css }} />
      <div style={{ fontSize:8, textAlign:"center", padding:"3px 0", color:active?"#00d4aa":"#999" }}>
        {filter.name}
      </div>
    </div>
  );
}

/**
 * Un boton de la barra de herramientas.
 *
 * Reemplaza al que vivia en la barra azul del editor. Mismo tamano y misma
 * forma que las herramientas de arriba, porque estan en la misma columna: si
 * fueran distintos se leerian como dos cosas separadas pegadas.
 *
 * `dim` no lo esconde: lo apaga y lo deja sin apretar. Un boton que desaparece
 * se busca donde ya no esta.
 */
function OpBtn({ onClick, children, dim, accent, danger, title }) {
  return (
    <button onClick={dim ? undefined : onClick} disabled={!!dim} title={title}
      style={{
        width:34, height:34, borderRadius:5, border:"none",
        fontSize:15, fontFamily:"inherit",
        cursor: dim ? "not-allowed" : "pointer",
        background: accent ? "#00d4aa" : "none",
        color: accent ? "#fff" : danger ? "#c0392b" : "#6B7280",
        opacity: dim ? 0.3 : 1,
      }}>{children}</button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

// ─── Componente interno (sin error boundary) ──────────────────────────────────

function ToolEditorInner({ initialImage, config: userConfig, onExport, onSaveToLibrary,
  onRequestLibrary, incomingImage, aiEnabled, onToggleAI, onReady, onChange, onError,
  /* El puente con el panel: `onApi` entrega las acciones de archivo una sola
     vez -es un objeto que se muta, no se reemplaza- y `onEstado` avisa lo que
     cambia. Ver el comentario largo mas abajo. */
  onApi, onEstado }) {
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  // Capa 4: Contrato — mergear config con defaults
  const config = validateConfig(userConfig);

  // Capa 3: Estado
  const state = useEditorState();
  const {
    cleanImgRef, imgEl, setImgEl,
    fileName, setFileName,
    originalSrc, setOriginalSrc,
    canvasDims, setCanvasDims,
    adj, setAdj, setAdjValue, resetAdj, resetAdjGroup,
    activeFilter, setActiveFilter,
    activeTab, setActiveTab,
    activeTool, setActiveTool,
    zoomLevel, setZoomLevel,
    cropStart, setCropStart,
    cropEnd, setCropEnd,
    isCropping, setIsCropping,
    aspectLock, setAspectLock,
    resetCrop,
    histRef, historyLen, setHistoryLen, histPos, setHistPos,
    bgStatus, setBgStatus,
    bgMessage, setBgMessage,
    tolerance, setTolerance,
    bgPreview, setBgPreview,
    outputFormat, setOutputFormat,
    quality, setQuality,
    outW, setOutW,
    outH, setOutH,
  } = state;




  const fitToView = useCallback((cw, ch) => {
    const tryFit = () => {
      const wrap = document.getElementById("ce-wrap");
      if (!wrap || !cw || !ch) return;
      const maxW = (wrap.offsetWidth  || wrap.clientWidth)  - 40;
      const maxH = (wrap.offsetHeight || wrap.clientHeight) - 40;
      if (maxW <= 0 || maxH <= 0) { requestAnimationFrame(tryFit); return; }
      setZoomLevel(Math.min(1, Math.min(maxW/cw, maxH/ch)));
    };
    requestAnimationFrame(tryFit);
  }, [setZoomLevel]);

  // ─── FIX #1: saveSnap con ref para evitar stale histIdx ──────────────────
  const saveSnap = useCallback((canvas) => {
    const snap = canvas.toDataURL();
    const h    = histRef.current;
    h.list     = [...h.list.slice(0, h.idx+1), snap];
    h.idx      = h.list.length - 1;
    setHistoryLen(h.list.length);
    setHistPos(h.idx);
  }, []);

  const loadSnap = useCallback((src) => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      canvas.style.filter = "none";
      canvas.width = image.width; canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      cleanImgRef.current = image;
      setImgEl(image);
      setCanvasDims({ w:image.width, h:image.height });
      fitToView(image.width, image.height);
    };
    image.src = src;
  }, [fitToView]);


  // ─── render ───────────────────────────────────────────────────────────────
  const render = useCallback((adjOverride, filterOverride) => {
    const canvas = canvasRef.current;
    const base   = cleanImgRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    ctx.drawImage(base, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyPixelAdjustments(data, adjOverride ?? adj);
    ctx.putImageData(data, 0, 0);
    const fid = filterOverride ?? activeFilter;
    const flt = FILTERS.find(f => f.id === fid);
    canvas.style.filter = flt?.id !== "none" ? flt.css : "none";
  }, [adj, activeFilter]);

  useEffect(() => { render(); }, [render]);

  // ─── loadImage ────────────────────────────────────────────────────────────
  const loadImage = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.style.filter = "none";
        canvas.width = image.width; canvas.height = image.height;
        canvas.getContext("2d").drawImage(image, 0, 0);
        cleanImgRef.current = image;
        setImgEl(image);
        setOriginalSrc(ev.target.result);
        setFileName(file.name);
        setCanvasDims({ w:image.width, h:image.height });
        setOutW(image.width); setOutH(image.height);
        resetAdj(); setActiveFilter("none");
        fitToView(image.width, image.height);
        histRef.current = { list:[], idx:-1 };
        saveSnap(canvas);
      };
      image.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    URL.revokeObjectURL(url);
  }, [fitToView, saveSnap, resetAdj]);

  // ─── loadImageFromUrl — cargar desde URL (Abrir desde biblioteca) ─────────
  const loadImageFromUrl = useCallback((url, name) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.filter = "none";
      canvas.width = image.width; canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      cleanImgRef.current = image;
      setImgEl(image);
      setFileName(name || "biblioteca");
      setCanvasDims({ w:image.width, h:image.height });
      setOutW(image.width); setOutH(image.height);
      resetAdj(); setActiveFilter("none");
      fitToView(image.width, image.height);
      histRef.current = { list:[], idx:-1 };
      saveSnap(canvas);
    };
    image.onerror = () => onError && onError({ message:"No se pudo cargar la imagen de la biblioteca" });
    image.src = url;
  }, [fitToView, saveSnap, resetAdj]);

  // Carga la imagen entrante desde el host (selector de biblioteca).
  // Si ya hay una imagen en el preview, la guarda en biblioteca antes de reemplazarla.
  useEffect(() => {
    if (incomingImage && incomingImage.url) {
      if (cleanImgRef.current && (onSaveToLibrary || onExport)) sendToLibrary();
      loadImageFromUrl(incomingImage.url, incomingImage.name);
    }
  }, [incomingImage, loadImageFromUrl]);

  // ─── commitToBase ─────────────────────────────────────────────────────────
  const commitToBase = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flt = FILTERS.find(f => f.id === activeFilter);
    if (flt && flt.id !== "none") bakeFilterToPixels(canvas, flt.css);
    canvas.style.filter = "none";
    const newBase = new Image();
    newBase.onload = () => {
      cleanImgRef.current = newBase;
      setImgEl(newBase);
      setActiveFilter("none");
      resetAdj();
      saveSnap(canvas);
    };
    newBase.src = canvas.toDataURL();
  }, [activeFilter, saveSnap, resetAdj]);
  const undo = () => {
    const h = histRef.current;
    if (h.idx <= 0) return;
    h.idx--;
    setHistPos(h.idx);
    loadSnap(h.list[h.idx]);
  };

  const redo = () => {
    const h = histRef.current;
    if (h.idx >= h.list.length-1) return;
    h.idx++;
    setHistPos(h.idx);
    loadSnap(h.list[h.idx]);
  };



  // ─── IA Remove BG — delega a effectsEngine ───────────────────────────────
  const handleRemoveBG = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !cleanImgRef.current) return;
    setBgStatus("loading");
    try {
      const { subject } = await engineRemoveBgAI(canvas, tolerance, setBgMessage);
      setBgStatus("done");
      setBgMessage(`✓ ${subject}`);
      setBgPreview(canvas.toDataURL());
      const ni = new Image();
      ni.onload = () => { cleanImgRef.current = ni; setImgEl(ni); };
      ni.src = canvas.toDataURL();
      saveSnap(canvas);
    } catch {
      setBgStatus("error");
      setBgMessage("Error IA — usando modo rápido");
      removeBackgroundFallback(canvas, tolerance);
      setBgPreview(canvas.toDataURL());
      const ni = new Image();
      ni.onload = () => { cleanImgRef.current = ni; setImgEl(ni); };
      ni.src = canvas.toDataURL();
      saveSnap(canvas);
      setBgStatus("done"); setBgMessage("✓ Modo rápido aplicado");
    }
  };

  const restoreBg = () => {
    if (!originalSrc) return;
    const image=new Image();
    image.onload=()=>{
      const canvas=canvasRef.current;
      canvas.style.filter="none";
      canvas.width=image.width; canvas.height=image.height;
      canvas.getContext("2d").drawImage(image,0,0);
      cleanImgRef.current=image; setImgEl(image);
      setBgStatus("idle"); setBgMessage(""); setBgPreview(null);
      saveSnap(canvas);
    };
    image.src=originalSrc;
  };

  // ─── Crop ─────────────────────────────────────────────────────────────────
  const onMD = (e) => {
    if (activeTool!=="crop") return;
    const r=canvasRef.current.getBoundingClientRect();
    const x=(e.clientX-r.left)/zoomLevel, y=(e.clientY-r.top)/zoomLevel;
    setCropStart({x,y}); setCropEnd({x,y}); setIsCropping(true);
  };
  const onMM = (e) => {
    if (!isCropping||activeTool!=="crop") return;
    const r=canvasRef.current.getBoundingClientRect();
    let x=(e.clientX-r.left)/zoomLevel, y=(e.clientY-r.top)/zoomLevel;
    if (aspectLock&&cropStart) y=cropStart.y+Math.sign(y-cropStart.y)*Math.abs((x-cropStart.x)/aspectLock);
    setCropEnd({x,y});
  };
  const onMU = () => setIsCropping(false);

  const applyCrop = () => {
    if (!cropStart||!cropEnd||!cleanImgRef.current) return;
    const canvas=canvasRef.current;
    const x=Math.min(cropStart.x,cropEnd.x), y=Math.min(cropStart.y,cropEnd.y);
    const w=Math.abs(cropEnd.x-cropStart.x), h=Math.abs(cropEnd.y-cropStart.y);
    if (w<10||h<10) return;
    // Hornear filtro antes de recortar
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=w; tmp.height=h;
    tmp.getContext("2d").drawImage(canvas,x,y,w,h,0,0,w,h);
    canvas.width=w; canvas.height=h;
    canvas.getContext("2d").drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setCanvasDims({w,h}); fitToView(w,h); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
    setCropStart(null); setCropEnd(null); setActiveTool("select");
  };

  // ─── Transformaciones ─────────────────────────────────────────────────────
  const rotateCanvas = (deg) => {
    if (!cleanImgRef.current) return;
    const canvas=canvasRef.current;
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=canvas.height; tmp.height=canvas.width;
    const tc=tmp.getContext("2d");
    tc.translate(tmp.width/2,tmp.height/2); tc.rotate(deg*Math.PI/180); tc.drawImage(canvas,-canvas.width/2,-canvas.height/2);
    canvas.width=tmp.width; canvas.height=tmp.height; canvas.getContext("2d").drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setCanvasDims({w:canvas.width,h:canvas.height}); fitToView(canvas.width,canvas.height); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
  };

  const flipCanvas = (dir) => {
    if (!cleanImgRef.current) return;
    const canvas=canvasRef.current, ctx=canvas.getContext("2d");
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    const tc=tmp.getContext("2d");
    tc.translate(dir==="h"?canvas.width:0, dir==="v"?canvas.height:0);
    tc.scale(dir==="h"?-1:1, dir==="v"?-1:1); tc.drawImage(canvas,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
  };

  const applyResize = () => {
    if (!cleanImgRef.current) return;
    const canvas=canvasRef.current;
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=outW; tmp.height=outH;
    tmp.getContext("2d").drawImage(canvas,0,0,outW,outH);
    canvas.width=outW; canvas.height=outH; canvas.getContext("2d").drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setCanvasDims({w:outW,h:outH}); fitToView(outW,outH); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
  };

  // ─── Export: construye el canvas final con el filtro horneado ─────────────
  const buildExportCanvas = () => {
    const canvas=canvasRef.current; if (!canvas||!cleanImgRef.current) return null;
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    tmp.getContext("2d").drawImage(canvas,0,0);
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(tmp, flt.css);
    return { tmp, mime:"image/"+outputFormat, q:quality/100 };
  };

  // Exportar = abrir el explorador para guardar en el equipo
  const downloadImage = () => {
    const e=buildExportCanvas(); if(!e) return;
    const ext  = outputFormat==="jpeg" ? "jpg" : outputFormat;
    const fname= `${(fileName||"imagen").replace(/\.[^.]+$/,"")}.${ext}`;
    e.tmp.toBlob(async (blob)=>{
      if(!blob) return;
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fname,
            types: [{ description:"Imagen", accept: { [e.mime]: ["."+ext] } }],
          });
          const w = await handle.createWritable();
          await w.write(blob); await w.close();
          return;
        } catch (err) { if (err && err.name==="AbortError") return; }
      }
      const a=document.createElement("a");
      const url=URL.createObjectURL(blob);
      a.href=url; a.download=fname; a.click();
      URL.revokeObjectURL(url);
    }, e.mime, e.q);
  };

  // Enviar a biblioteca = manda el blob al host (Supabase)
  const sendToLibrary = () => {
    const cb = onSaveToLibrary || onExport;
    if (!cb) { alert("La biblioteca no está conectada en este contexto."); return; }
    const e=buildExportCanvas(); if(!e) return;
    e.tmp.toBlob(blob=>cb(blob,outputFormat), e.mime, e.q);
  };

  // Limpiar = vaciar el preview y resetear historial
  const clearEditor = () => {
    cleanImgRef.current=null;
    setImgEl(null);
    setFileName("");
    setCanvasDims({ w:0, h:0 });
    resetAdj(); setActiveFilter("none");
    setCropStart(null); setCropEnd(null); setActiveTool("select");
    histRef.current={ list:[], idx:-1 };
    setHistoryLen(0); setHistPos(-1);
    const c=canvasRef.current; if(c){ c.width=0; c.height=0; }
  };

  const copyToClipboard = () => {
    const canvas=canvasRef.current; if (!canvas) return;
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    tmp.getContext("2d").drawImage(canvas,0,0);
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(tmp,flt.css);
    tmp.toBlob(blob=>navigator.clipboard.write([new ClipboardItem({"image/png":blob})])
      .then(()=>alert("Copiado al portapapeles"))
      .catch(()=>alert("Sin permisos de portapapeles")));
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const hasCrop  = cropStart && cropEnd;
  const cropRect = hasCrop ? {
    x: Math.min(cropStart.x,cropEnd.x)*zoomLevel,
    y: Math.min(cropStart.y,cropEnd.y)*zoomLevel,
    w: Math.abs(cropEnd.x-cropStart.x)*zoomLevel,
    h: Math.abs(cropEnd.y-cropStart.y)*zoomLevel,
  } : null;

  const hasImage  = !!cleanImgRef.current;
  const canUndo   = histPos > 0;
  const canRedo   = histPos < historyLen - 1;

  /*
   * EL PUENTE CON EL PANEL.
   *
   * `api` es un objeto que NUNCA cambia de identidad: se muta, no se
   * reemplaza. Por eso se puede entregar una sola vez y el panel lo guarda sin
   * que eso lo vuelva a dibujar. Si se entregaran funciones nuevas en cada
   * render, el panel se redibujaria, el editor tambien, y no pararia nunca.
   *
   * Lo que si cambia -si hay imagen, si se puede deshacer- viaja aparte y como
   * datos sueltos, que es lo unico que puede disparar un dibujo nuevo.
   */
  const api = useRef({});
  api.current.abrir     = () => onRequestLibrary && onRequestLibrary();
  api.current.subir     = () => fileInputRef.current && fileInputRef.current.click();
  api.current.guardar   = () => sendToLibrary();
  api.current.descargar = () => downloadImage();
  api.current.nuevo     = () => clearEditor();

  useEffect(() => { if (onApi) onApi(api.current); }, [onApi]);

  useEffect(() => {
    if (onEstado) onEstado({ canUndo, canRedo, archivo: fileName });
  }, [onEstado, canUndo, canRedo, fileName]);

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* La barra propia se fue: las acciones de archivo estan en el MenuBar del
          panel y las de imagen, abajo, al lado de las herramientas. El nombre
          del editor tambien se fue: ya esta en la barra de arriba. */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}}
        onChange={e=>{if(e.target.files[0]){ if(cleanImgRef.current&&(onSaveToLibrary||onExport))sendToLibrary(); loadImage(e.target.files[0]); }}}/>

      <div style={S.main}>
        {/* HERRAMIENTAS, y debajo lo que se le hace a la imagen */}
        <div style={S.toolsPanel}>
          {TOOLS.map(t=>(
            <button key={t.id} title={t.label}
              style={{...S.toolBtn,...(activeTool===t.id?S.toolActive:{})}}
              onClick={()=>{setActiveTool(t.id);if(t.id!=="crop"){setCropStart(null);setCropEnd(null);}}}>
              {t.icon}
            </button>
          ))}

          {/* La raya separa elegir CON QUE trabajar de hacerle algo a la
              imagen. Son dos cosas distintas y antes vivian en dos barras
              distintas; juntas y separadas por una linea se entiende igual sin
              cruzar la pantalla. */}
          <div style={{width:26,height:1,background:"#C8D5E8",margin:"8px 0"}}/>

          <OpBtn onClick={undo} dim={!canUndo} title="Deshacer">&#8629;</OpBtn>
          <OpBtn onClick={redo} dim={!canRedo} title="Rehacer">&#8628;</OpBtn>
          <OpBtn onClick={()=>rotateCanvas(-90)} title="Rotar 90&deg; a la izquierda">&#8630;</OpBtn>
          <OpBtn onClick={()=>rotateCanvas(90)}  title="Rotar 90&deg; a la derecha">&#8631;</OpBtn>
          <OpBtn onClick={()=>flipCanvas("h")}   title="Espejar en horizontal">&#8646;</OpBtn>
          <OpBtn onClick={()=>flipCanvas("v")}   title="Espejar en vertical">&#8645;</OpBtn>
          <OpBtn onClick={commitToBase} title="Aplicar todo: fija los ajustes sobre la imagen">&#10003;</OpBtn>

          {/* Recortar aparece solo mientras se esta recortando: fuera de eso no
              hay nada que aplicar ni que cancelar. */}
          {activeTool==="crop" && (<>
            <div style={{width:26,height:1,background:"#C8D5E8",margin:"8px 0"}}/>
            <OpBtn onClick={applyCrop} accent title="Aplicar el corte">&#9986;</OpBtn>
            <OpBtn danger title="Cancelar el corte"
              onClick={()=>{setCropStart(null);setCropEnd(null);setActiveTool("select");}}>&#10005;</OpBtn>
          </>)}
        </div>

        {/* CANVAS */}
        <div id="ce-wrap" style={S.canvasWrap}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();if(e.dataTransfer.files[0])loadImage(e.dataTransfer.files[0]);}}>
          <div style={S.checker}/>
          {/* Drop zone — visible solo sin imagen */}
          {!hasImage && (
            <div style={S.dropZone}>
              <div style={{fontSize:52,opacity:.2}}>🖼</div>
              <div style={{fontSize:13,letterSpacing:2,color:"#bbb"}}>ARRASTRA TU IMAGEN AQUÍ</div>
              <div style={{fontSize:10,color:"#999",marginTop:4}}>o usa el botón + cargar</div>
              <button style={{...S.btnPrimary,marginTop:16}} onClick={()=>fileInputRef.current.click()}>+ cargar imagen</button>
            </div>
          )}

          {/* Canvas — SIEMPRE en el DOM, solo oculto visualmente sin imagen */}
          <div style={{position:"relative", display: hasImage ? "flex" : "none", alignItems:"center", justifyContent:"center", width:"100%", height:"100%", overflow:"hidden"}}>
            <canvas ref={canvasRef}
              style={{display:"block",
                width:canvasDims.w*zoomLevel, height:canvasDims.h*zoomLevel,
                cursor:TOOLS.find(t=>t.id===activeTool)?.cursor||"default"}}
              onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}/>
            {cropRect && (
              <div style={{position:"absolute",border:"2px solid #00d4aa",background:"rgba(0,212,170,.05)",
                pointerEvents:"none",left:cropRect.x,top:cropRect.y,width:cropRect.w,height:cropRect.h}}>
                {[33.3,66.6].map(p=>(
                  <div key={p} style={{position:"absolute",left:`${p}%`,top:0,bottom:0,borderLeft:"1px solid rgba(255,255,255,.25)"}}/>
                ))}
                {[33.3,66.6].map(p=>(
                  <div key={p} style={{position:"absolute",top:`${p}%`,left:0,right:0,borderTop:"1px solid rgba(255,255,255,.25)"}}/>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div style={S.rightPanel}>
          <div style={S.panelTabs}>
            {["adjust","format","filters","effects","export"].map(tab=>(
              <button key={tab} style={{...S.ptab,...(activeTab===tab?S.ptabActive:{})}}
                onClick={()=>setActiveTab(tab)}>
                {{adjust:"Ajustes",format:"Formato",filters:"Filtros",effects:"Efectos",export:"Export"}[tab]}
              </button>
            ))}
          </div>

          <div style={{padding:"10px 10px 20px",overflowY:"auto",flex:1}}>

            {/* AJUSTES */}
            {activeTab==="adjust" && <>
              {/* Remove BG */}
              <div style={S.aiBanner}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:"#555"}}>Quitar fondo</span>
                  <span style={S.aiBadge}>IA</span>
                </div>
                {bgPreview && (
                  <div style={{width:"100%",height:76,borderRadius:4,border:"1px solid #e0e0e0",overflow:"hidden",
                    marginBottom:8,background:"repeating-conic-gradient(#ddd 0% 25%,#f5f5f5 0% 50%) 0 0/12px 12px"}}>
                    <img src={bgPreview} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                  </div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:10,color:"#888",width:68,flexShrink:0}}>Tolerancia</span>
                  <input type="range" min={5} max={80} value={tolerance}
                    onChange={e=>setTolerance(parseInt(e.target.value))}
                    style={{flex:1,accentColor:"#7c3aed"}}/>
                  <span style={{fontSize:10,color:"#7c3aed",width:22,textAlign:"right"}}>{tolerance}</span>
                </div>
                {bgStatus==="loading" && <div style={{fontSize:10,color:"#7c3aed",marginBottom:6}}>⟳ {bgMessage}</div>}
                {bgStatus==="done"    && <div style={{fontSize:10,color:"#16a34a",marginBottom:6}}>✓ {bgMessage}</div>}
                {bgStatus==="error"   && <div style={{fontSize:10,color:"#dc2626",marginBottom:6}}>⚠ {bgMessage}</div>}
                <button style={{...S.applyBtn,background:"#7c3aed",marginBottom:4}}
                  onClick={handleRemoveBG} disabled={!hasImage||bgStatus==="loading"}>
                  {bgStatus==="loading"?"⟳ procesando...":"🪄 quitar fondo con IA"}
                </button>
                <button style={{...S.applyBtn,...S.applyBtnGhost}} onClick={restoreBg}>↩ restaurar original</button>
              </div>

              <SectionHeader label="Luz" onReset={()=>resetAdjGroup('light')}/>
              {[["Exposición","exposure"],["Contraste","contrast"],["Brillo","brightness"],["Sombras","shadows"],["Altas luces","highlights"]].map(([l,k])=>(
                <SliderRow key={k} label={l} id={k} value={adj[k]} onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              ))}

              <SectionHeader label="Color" onReset={()=>resetAdjGroup('color')}/>
              {[["Saturación","saturation"],["Temperatura","temperature"],["Tinte","tint"],["Vibración","vibrance"]].map(([l,k])=>(
                <SliderRow key={k} label={l} id={k} value={adj[k]} onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              ))}

              <SectionHeader label="Detalle" onReset={()=>resetAdjGroup('detail')}/>
              <SliderRow label="Nitidez"  id="sharpness" min={0} max={100} value={adj.sharpness} onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              <SliderRow label="Claridad" id="clarity"              value={adj.clarity}   onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              <SliderRow label="Ruido"    id="noise"    min={0} max={100} value={adj.noise}     onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              <SliderRow label="Viñeta"   id="vignette"             value={adj.vignette}  onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>

              <button style={{...S.applyBtn,marginTop:10}} onClick={commitToBase}>✓ aplicar y congelar</button>
              <button style={{...S.applyBtn,...S.applyBtnGhost,marginTop:4}}
                onClick={()=>{resetAdj();setActiveFilter("none");}}>
                ↺ resetear ajustes
              </button>
            </>}

            {/* FORMATO */}
            {activeTab==="format" && <>
              <SectionHeader label="Relaciones de aspecto"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
                {ASPECT_PRESETS.map(p=>(
                  <button key={p.label} style={S.fmtBtn}
                    onClick={()=>{setAspectLock(p.w/p.h);setActiveTool("crop");}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#222"}}>{p.label}</div>
                    <div style={{fontSize:8,color:"#aaa"}}>{p.tag}</div>
                  </button>
                ))}
              </div>
              <SectionHeader label="Redes sociales"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
                {SOCIAL_PRESETS.map(p=>(
                  <button key={p.label} style={S.fmtBtn}
                    onClick={()=>{setOutW(p.w);setOutH(p.h);}}>
                    <div style={{fontSize:10,color:"#333"}}>{p.label}</div>
                    <div style={{fontSize:8,color:"#aaa"}}>{p.w}×{p.h}</div>
                  </button>
                ))}
              </div>
              <SectionHeader label="Tamaño personalizado"/>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#aaa",marginBottom:3}}>ANCHO (px)</div>
                  <input type="number" value={outW} onChange={e=>setOutW(parseInt(e.target.value)||1)} style={S.numInput}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#aaa",marginBottom:3}}>ALTO (px)</div>
                  <input type="number" value={outH} onChange={e=>setOutH(parseInt(e.target.value)||1)} style={S.numInput}/>
                </div>
              </div>
              <button style={S.applyBtn} onClick={applyResize}>↕ redimensionar</button>
            </>}

            {/* FILTROS */}
            {activeTab==="filters" && <>
              <SectionHeader label="Filtros clásicos"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                {FILTERS.map(f=>(
                  <FilterThumb key={f.id} filter={f} active={activeFilter===f.id}
                    imgEl={cleanImgRef.current} onClick={()=>setActiveFilter(f.id)}/>
                ))}
              </div>
              <button style={{...S.applyBtn,marginTop:10}} onClick={commitToBase}>✓ aplicar filtro</button>
            </>}

            {/* EFECTOS */}
            {activeTab==="effects" && (
              <EffectsPanel
                canvasRef={canvasRef}
                cleanImgRef={cleanImgRef}
                hasImage={hasImage}
                onCommit={(canvas) => saveSnap(canvas)}
              />
            )}

            {/* EXPORT */}
            {activeTab==="export" && <>
              <SectionHeader label="Formato de salida"/>
              <div style={{display:"flex",gap:4,marginBottom:10}}>
                {["jpeg","png","webp"].map(f=>(
                  <button key={f} style={{...S.outBtn,...(outputFormat===f?S.outBtnActive:{})}}
                    onClick={()=>setOutputFormat(f)}>
                    {f==="jpeg"?"JPG":f.toUpperCase()}
                  </button>
                ))}
              </div>
              {outputFormat!=="png" && (
                <SliderRow label="Calidad" id="quality" min={10} max={100}
                  value={quality} onChange={(_,v)=>setQuality(v)}/>
              )}
              <div style={S.sizeCard}>
                <span style={{color:"#888"}}>Tamaño estimado</span>
                <span style={{color:"#16a34a",fontWeight:500}}>
                  {hasImage?estimateFileSize(canvasDims.w,canvasDims.h,outputFormat,quality):"—"}
                </span>
              </div>
              <div style={{...S.sizeCard,marginTop:4}}>
                <span style={{color:"#888"}}>Dimensiones</span>
                <span style={{color:"#00d4aa",fontWeight:500}}>
                  {canvasDims.w>0?`${canvasDims.w} × ${canvasDims.h}`:"— × —"}
                </span>
              </div>
              <div style={{fontSize:10,color:"#aaa",lineHeight:1.9,margin:"10px 0"}}>
                <div>JPG → compresión alta, sin transparencia</div>
                <div>PNG → sin pérdida, soporta transparencia</div>
                <div>WebP → mejor ratio calidad/tamaño</div>
              </div>
              <button style={S.applyBtn} onClick={downloadImage}>⬇ descargar imagen</button>
              <button style={{...S.applyBtn,...S.applyBtnGhost,marginTop:4}} onClick={copyToClipboard}>📋 copiar al portapapeles</button>
            </>}
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={S.statusbar}>
        {/* El nombre del archivo estaba arriba, cortado a 120px. Aca, con la
            dimension y el zoom, esta con la informacion de su mismo tipo. */}
        <StatItem label="archivo"     value={fileName || "sin imagen"}/>
        <StatItem label="herramienta" value={activeTool}/>
        <StatItem label="dimensión"   value={canvasDims.w>0?`${canvasDims.w}×${canvasDims.h}`:"—"}/>
        <StatItem label="zoom"        value={`${Math.round(zoomLevel*100)}%`}/>
        <StatItem label="filtro"      value={activeFilter}/>
        <StatItem label="historial"   value={`${histPos+1}/${historyLen}`}/>
        <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center"}}>
          <button style={S.zoomBtn} onClick={()=>setZoomLevel(z=>Math.max(0.05,z-0.25))}>−</button>
          <span style={{fontSize:10,color:"#aaa",minWidth:36,textAlign:"center"}}>{Math.round(zoomLevel*100)}%</span>
          <button style={S.zoomBtn} onClick={()=>setZoomLevel(z=>Math.min(8,z+0.25))}>+</button>
          <button style={{...S.zoomBtn,width:"auto",padding:"0 8px",fontSize:9}}
            onClick={()=>fitToView(canvasDims.w,canvasDims.h)}>fit</button>
        </div>
      </div>
    </div>
  );
}

// ─── Estilos — desde designSystem ────────────────────────────────────────────

// ─── Export default con Error Boundary (Capa 5) ───────────────────────────────

export default function ToolEditor(props) {
  return (
    <ToolEditorErrorBoundary onError={props.onError}>
      <ToolEditorInner {...props} />
    </ToolEditorErrorBoundary>
  );
}




