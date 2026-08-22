/* =====================================================
   CORE Storefront
   CORE Marketplace Builder v1.5
   Frontstore principal: Market + Segunda Mano
   ===================================================== */
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '../../utils/supabase/client';
import { useProductos } from '../hooks/useProductos';
import { agregarAlCarrito } from '../services/carritoApi';
import '../../styles/core-storefront.css';


// ── Types ─────────────────────────────────────────────────────────────────────
interface MktProduct {
  id: number; img: string; d: string; n: string;
  p: string; o: string | null; b: string | null; bt: string;
  desc: string; r: number; rv: number; q: string; vids?: string[]; // Array de videos (máximo 5)
  publishedDate?: string;
  sellerName?: string; // Nombre del vendedor
}
interface ShProduct {
  id: number; img: string; d: string; n: string;
  p: string; og: string; c: number;
  desc: string; r: number; rv: number; q: string; vids?: string[]; // Array de videos (máximo 5)
  publishedDate?: string;
}
interface CartItem { id: number; img: string; n: string; p: string; pNum: number; m: 'mkt' | 'sh'; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const parsePrice = (p: string) => parseInt(p.replace(/[\$\.]/g, ''), 10);
const fmtNum = (n: number) => '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const separatePrice = (price: string) => {
  if (!price) return price;
  // Eliminar puntos de los miles
  let cleanedPrice = price.replace(/\./g, '');
  // Si el precio contiene $, separarlo del valor con un espacio
  const dollarIndex = cleanedPrice.indexOf('$');
  if (dollarIndex !== -1) {
    const before = cleanedPrice.substring(0, dollarIndex).trim();
    const after = cleanedPrice.substring(dollarIndex + 1).trim();
    return <>{before ? before + ' ' : ''}$ {after}</>;
  }
  return cleanedPrice;
};

// ── Department Colors (Pastel) ──────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  'Electro': '#DDA0DD',      // Lila pastel
  'Moda': '#FFB6C1',         // Rosa pastel
  'Hogar': '#FFDAB9',        // Melocotón
  'Almacén': '#FFF8DC',      // Amarillo pastel
  'Mascotas': '#FA8072',     // Salmón
  'Motos': '#AFEEEE',        // Turquesa
  'Limpieza': '#FFE4E1',     // Melocotón claro
  'Salud': '#B0E0E6',        // Azul claro
  'Deporte': '#D8BFD8',      // Morado pastel
  'Celulares': '#F5DEB3',    // Beige
  'Ferretería': '#F0FFF0',   // Menta
  'Librería': '#FFFDD0',     // Crema
  'Bebés': '#E0B0FF',        // Malva
  'Gaming': '#E6E6FA',       // Lavanda
  'Jardín': '#FF7F50',       // Coral
  'Autos': '#DDA0DD',        // Lila pastel (repetido si necesario)
  'Belleza': '#FFB6C1',      // Rosa pastel (repetido si necesario)
  'Delivery': '#FFDAB9',     // Melocotón (repetido si necesario)
};


const COND = ['','Regular','Buen estado','Buen estado','Muy bueno','Excelente'];
const DEPTS = [
  'Electro','Moda','Hogar','Almacén','Mascotas','Motos',
  'Limpieza','Salud','Deporte','Celulares','Ferretería','Librería',
  'Bebés','Gaming','Jardín','Autos','Belleza','Delivery',
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconHome   = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IconGrid   = () => <svg className="core-nico" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IconShield = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconSearch = () => <svg className="core-nico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconUser   = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconBag    = () => <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const IconSrchSm = () => <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCart   = ({ size = 11 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconCartFilled = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconCartWithNumber = ({ count }: { count: number }) => {
  const fontSize = Math.min(10 + count * 0.5, 14); // Tamaño de fuente que aumenta con la cantidad, máximo 14px
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'relative' }}>
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      {count > 0 && (
        <text 
          x="12" 
          y="13.5" 
          fontSize={fontSize} 
          fill="currentColor" 
          fontWeight="normal"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ 
            fontFamily: 'Arial, sans-serif', 
            fontWeight: 'normal', 
            fontStyle: 'normal',
            pointerEvents: 'none'
          }}
        >
          {count}
        </text>
      )}
    </svg>
  );
};
const IconBell   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconPlay   = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" fill="#222" stroke="none">
    <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
  </svg>
);
// Iconos para controles de video - aceptan color como prop
const IconPlayTriangle = ({ filled = false, color = "#fff" }: { filled?: boolean; color?: string }) => (
  <svg viewBox="0 0 12 12" width="9.6" height="9.6" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? "0" : "1.5"} strokeLinejoin="round">
    <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
  </svg>
);
const IconVolume = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconRewind = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 19 2 12 11 5 11 19"/>
    <polygon points="22 19 13 12 22 5 22 19"/>
  </svg>
);
const IconPause = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill={color} stroke="none">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);
const IconForward = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 19 22 12 13 5 13 19"/>
    <polygon points="2 19 11 12 2 5 2 19"/>
  </svg>
);
const IconBack = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);


async function trackEvent(eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_API_URL}/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ event_type: eventType, metadata }),
    });
  } catch (_) {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SlideCard({ p, isOpen, dir, onToggle, onAdd, deptColors, cartItems, isInCart }: {
  p: ShProduct; isOpen: boolean; dir: 'right' | 'left';
  onToggle: () => void; onAdd: () => void; deptColors: Record<string, string>;
  cartItems: CartItem[]; isInCart: boolean;
}) {
  const SHOW_EMPTY_THUMBNAIL_BORDERS = true; // Controla si se muestran bordes en espacios vacíos del grid
  const [playing, setPlaying] = useState(false);
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);
  const [label,   setLabel]   = useState('Agregar al Carrito');
  const [style,   setStyle]   = useState<React.CSSProperties>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar si está en mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Función para reproducir sonido de clic
  const playClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silenciar errores si el audio no está disponible
    }
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [iconColor, setIconColor] = useState('#fff'); // Color de los iconos basado en luminosidad
  const imgRef = useRef<HTMLImageElement>(null);
  const [showBackArrow, setShowBackArrow] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [showSellerInfo, setShowSellerInfo] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd();
    setLabel('✓ Listo'); setStyle({ background: 'color-mix(in srgb, var(--color-success) 70%, white)' });
    setTimeout(() => { setLabel('Agregar al Carrito'); setStyle({}); }, 1100);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile) {
      // En mobile, usar flip
      const next = !flipped;
      setFlipped(next);
    } else {
      // En desktop, usar slide
      onToggle();
    }
  };

  // Crear array de imágenes del artículo (la primera es la principal)
  // Por ahora usamos solo la imagen principal, las demás serán null/vacías
  // Esto se puede expandir para tener múltiples imágenes reales del producto
  const articleImages: (string | null)[] = [p.img, null, null, null, null];
  const selectedImage = articleImages[selectedImageIndex] || p.img;
  
  // Array de videos (máximo 5)
  const videos = p.vids || [];
  const videoArray: (string | null)[] = [...videos.slice(0, 5)];
  while (videoArray.length < 5) videoArray.push(null);
  
  const handleVideoClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoArray[index]) {
      setPlayingVideoIndex(index);
      setPlaying(true);
      setIsPaused(false);
      setShowBackArrow(false);
      // Mostrar flecha después de 2 segundos
      setTimeout(() => {
        setShowBackArrow(true);
      }, 2000);
    }
  };
  
  const handleCloseVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaying(false);
    setPlayingVideoIndex(null);
    setShowBackArrow(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };
  
  const handleVideoCenterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Calcular distancia desde el centro (área central del 30% del video)
    const centerArea = 0.3;
    const distX = Math.abs(clickX - centerX) / rect.width;
    const distY = Math.abs(clickY - centerY) / rect.height;
    
    // Si el clic está en el área central, cerrar el video
    if (distX < centerArea && distY < centerArea) {
      handleCloseVideo(e);
    } else {
      // Si no está en el centro, toggle play/pause
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };
  
  const handleVideoControl = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    switch (action) {
      case 'pause':
        videoRef.current.pause();
        setIsPaused(true);
        break;
      case 'play':
        videoRef.current.play();
        setIsPaused(false);
        break;
      case 'rewind':
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        break;
      case 'forward':
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        break;
      case 'speed1.5':
        videoRef.current.playbackRate = 1.5;
        setPlaybackRate(1.5);
        break;
      case 'speed2':
        videoRef.current.playbackRate = 2;
        setPlaybackRate(2);
        break;
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const vol = parseFloat(e.target.value);
      videoRef.current.volume = vol;
      setVolume(vol);
      if (vol > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const handleVolumeIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isMuted) {
        // Desmutear
        videoRef.current.muted = false;
        setIsMuted(false);
      } else {
        // Mutear
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };
  
  // Detectar luminosidad de la imagen para ajustar color de iconos blancos
  useEffect(() => {
    const useHeuristicFallback = () => {
      // Heurística: analizar la URL de la imagen para detectar imágenes claras comunes
      const url = p.img.toLowerCase();
      const lightKeywords = ['white', 'light', 'bright', 'clear', 'iphone', 'phone', 'device', 'photo-1635425730507'];
      const hasLightKeyword = lightKeywords.some(keyword => url.includes(keyword));
      
      // Para Second Hand, ser más agresivo con el gris oscuro ya que muchas imágenes tienen fondos claros
      // Especialmente para productos como iPhone que típicamente tienen fondos blancos
      if (hasLightKeyword || p.d === 'Celulares') {
        setIconColor('#333');
      } else {
        // Por defecto, asumir que puede ser claro y usar gris oscuro para mejor contraste
        setIconColor('#333');
      }
    };
    
    const detectImageBrightness = () => {
      if (!imgRef.current) return;
      const img = imgRef.current;
      
      // Verificar que la imagen tenga dimensiones válidas
      if (!img.naturalWidth && !img.width) return;
      if (!img.naturalHeight && !img.height) return;
      
      // Intentar con crossOrigin primero
      let triedCrossOrigin = false;
      const tryDetection = (useCrossOrigin = false) => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          
          const imgWidth = img.naturalWidth || img.width;
          const imgHeight = img.naturalHeight || img.height;
          canvas.width = Math.min(imgWidth, 200);
          canvas.height = Math.min(imgHeight, 200);
          
          // Si necesitamos crossOrigin, crear una nueva imagen
          if (useCrossOrigin && !triedCrossOrigin) {
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            testImg.onload = () => {
              try {
                ctx.drawImage(testImg, 0, 0, canvas.width, canvas.height);
                analyzeCanvas(ctx, canvas.width, canvas.height);
              } catch (e) {
                useHeuristicFallback();
              }
            };
            testImg.onerror = () => {
              triedCrossOrigin = true;
              useHeuristicFallback();
            };
            testImg.src = p.img;
            return;
          }
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          analyzeCanvas(ctx, canvas.width, canvas.height);
        } catch (e) {
          // Si falla, intentar con crossOrigin si no lo hemos intentado
          if (!triedCrossOrigin) {
            triedCrossOrigin = true;
            tryDetection(true);
          } else {
            useHeuristicFallback();
          }
        }
      };
      
      const analyzeCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const sampleSize = 20;
        const corners = [
          { x: 0, y: 0 },
          { x: width - sampleSize, y: 0 },
          { x: 0, y: height - sampleSize },
          { x: width - sampleSize, y: height - sampleSize }
        ];
        
        let totalBrightness = 0;
        let sampleCount = 0;
        
        corners.forEach(corner => {
          try {
            const imageData = ctx.getImageData(
              Math.max(0, corner.x), 
              Math.max(0, corner.y), 
              sampleSize, 
              sampleSize
            );
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              if (a > 128) {
                const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                totalBrightness += brightness;
                sampleCount++;
              }
            }
          } catch (e) {
            // Continuar con siguiente esquina
          }
        });
        
        if (sampleCount > 0) {
          const avgBrightness = totalBrightness / sampleCount;
          // Umbral más bajo (0.45) para ser más sensible a fondos claros
          setIconColor(avgBrightness > 0.45 ? '#333' : '#fff');
        } else {
          useHeuristicFallback();
        }
      };
      
      tryDetection();
    };
    
    // Para productos de celulares en Second Hand, usar gris oscuro por defecto
    if (p.d === 'Celulares') {
      setIconColor('#333');
    }
    
    // Intentar múltiples veces para asegurar que funcione
    const attemptDetection = () => {
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
        detectImageBrightness();
      } else {
        // Si la imagen no está lista, usar fallback después de un tiempo
        setTimeout(() => {
          if (!imgRef.current?.complete || imgRef.current.naturalWidth === 0) {
            useHeuristicFallback();
          }
        }, 1000);
      }
    };
    
    // Intentar inmediatamente
    attemptDetection();
    
    // Intentar después de un delay
    const timeout1 = setTimeout(attemptDetection, 100);
    const timeout2 = setTimeout(attemptDetection, 500);
    const timeout3 = setTimeout(() => {
      // Si después de 1 segundo no se ha detectado, usar fallback
      useHeuristicFallback();
    }, 1000);
    
    // También escuchar el evento load
    const handleLoad = () => {
      setTimeout(attemptDetection, 100);
    };
    
    const img = imgRef.current;
    if (img) {
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', () => {
        useHeuristicFallback();
      });
      
      return () => {
        img.removeEventListener('load', handleLoad);
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    } else {
      // Si no hay imagen ref aún, usar fallback
      useHeuristicFallback();
    }
  }, [p.img, p.d]);

  // En mobile, usar flip; en desktop, usar slide
  if (isMobile) {
    return (
      <div className="core-card-slot">
        <div id={`fc${p.id}`} className={`core-fc${flipped ? ' flipped' : ''}`} onClick={handleToggle}>
          <div className="core-fi">
            {/* FRONT FACE - usar la misma estructura que FlipCard */}
            <div className="core-ff">
              {/* Contenido del frente - copiar de FlipCard */}
              <div className="core-top">
                <div className="core-cimg">
                  {playing && playingVideoIndex !== null && videoArray[playingVideoIndex] ? (
                    <>
                      <video
                        ref={videoRef}
                        className="core-vid-frame"
                        src={videoArray[playingVideoIndex] || ''}
                        autoPlay={!isPaused}
                        muted={isMuted}
                        playsInline
                        loop={false}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '102%',
                          height: '102%',
                          objectFit: 'cover',
                          margin: 0,
                          padding: 0,
                          border: 'none',
                          outline: 'none',
                          minWidth: '100%',
                          minHeight: '100%'
                        }}
                        onClick={handleVideoCenterClick}
                      />
                      {showBackArrow && (
                        <button
                          onClick={handleCloseVideo}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            zIndex: 6,
                            background: iconColor === '#333' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            backdropFilter: 'blur(4px)'
                          }}
                        >
                          <IconBack color={iconColor} />
                        </button>
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        zIndex: 5,
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        backgroundColor: iconColor === '#333' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        backdropFilter: 'blur(4px)'
                      }}>
                        <button onClick={(e) => handleVideoControl('rewind', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                          <IconRewind color={iconColor} />
                        </button>
                        <button onClick={(e) => handleVideoControl(isPaused ? 'play' : 'pause', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                          {isPaused ? <IconPlayTriangle filled color={iconColor} /> : <IconPause color={iconColor} />}
                        </button>
                        <button onClick={(e) => handleVideoControl('forward', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                          <IconForward color={iconColor} />
                        </button>
                        <button onClick={(e) => handleVideoControl('speed1.5', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: iconColor, fontSize: '11px', fontWeight: 600 }}>1.5x</button>
                        <button onClick={(e) => handleVideoControl('speed2', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: iconColor, fontSize: '11px', fontWeight: 600 }}>2x</button>
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        zIndex: 5,
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center'
                      }}>
                        <button 
                          onClick={handleVolumeIconClick}
                          style={{ 
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <IconVolume color={iconColor} />
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={handleVolumeChange}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            width: '60px', 
                            height: '3px', 
                            cursor: 'pointer',
                            accentColor: iconColor === '#333' ? '#333' : '#fff',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            background: iconColor === '#333' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
                            borderRadius: '2px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={p.img} alt={p.n} ref={imgRef} />
                      {!playing && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '8px', 
                          left: '8px', 
                          zIndex: 4 
                        }}>
                          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                              <span key={i} style={{ color: i <= Math.round(p.r) ? '#FFD700' : '#C8C4BE', fontSize: '12px' }}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {videoArray.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          zIndex: 4,
                          display: 'flex',
                          gap: '4px',
                          alignItems: 'center'
                        }}>
                          {videoArray.map((vid, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => handleVideoClick(idx, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: vid ? 'pointer' : 'default',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                opacity: vid ? 1 : 0.5
                              }}
                            >
                              <IconPlayTriangle filled={!!vid} color={iconColor} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="core-dept-label">{p.d}</div>
                </div>
              </div>
              <div className="core-divider" style={{ backgroundColor: deptColors[p.d] }} />
              <div className="core-middle">
                <div className="core-title">{p.n}</div>
                <div className="core-price">$ {p.p}</div>
              </div>
              <div className="core-bottom">
                <button className="core-add-btn" onClick={handleAdd} disabled={p.stock === 0} style={p.stock === 0 ? { background: '#ccc', cursor: 'not-allowed', color: '#888' } : style}>
              {p.stock === 0 ? 'Sin stock' : label}
            </button>
              </div>
            </div>
            {/* BACK FACE - usar la misma estructura que FlipCard */}
            <div className="core-fb">
              <img className="core-ghost-img" src={selectedImage} alt="" aria-hidden="true" />
              <div className="core-fb-content">
                {/* Miniaturas */}
                <div className="core-panel-miniatures" style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                  marginBottom: '0px',
                  width: '100%'
                }}>
                  {articleImages.map((img, idx) => (
                    <div 
                      key={`mini-${p.id}-${idx}`} 
                      onClick={img ? (e) => { 
                        e.stopPropagation(); 
                        setSelectedImageIndex(idx); 
                      } : undefined}
                      style={{ 
                        width: '100%', 
                        aspectRatio: '1 / 1',
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        border: img && selectedImageIndex === idx 
                          ? '2px solid color-mix(in srgb, var(--color-success) 70%, white)' 
                          : img 
                            ? '1.5px solid rgba(255,255,255,0.3)' 
                            : SHOW_EMPTY_THUMBNAIL_BORDERS 
                              ? '1px solid rgba(107, 184, 122, 0.3)' 
                              : 'none',
                        cursor: img ? 'pointer' : 'default',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: img ? (selectedImageIndex === idx ? 1 : 0.8) : (SHOW_EMPTY_THUMBNAIL_BORDERS ? 1 : 0),
                        backgroundColor: img ? 'transparent' : (SHOW_EMPTY_THUMBNAIL_BORDERS ? 'rgba(107, 184, 122, 0.05)' : 'transparent'),
                      }}
                      onMouseEnter={img ? (e) => {
                        if (selectedImageIndex !== idx) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.opacity = '1';
                        }
                      } : undefined}
                      onMouseLeave={img ? (e) => {
                        if (selectedImageIndex !== idx) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.opacity = '0.8';
                        }
                      } : undefined}
                    >
                      {img ? (
                        <img 
                          src={img} 
                          alt={`${p.n} - Foto ${idx + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            aspectRatio: '1 / 1'
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                {/* Línea de color con categoría y nombre */}
                <div style={{ 
                  width: 'calc(100% + 16px)', 
                  height: '11.5px',
                  backgroundColor: deptColors[p.d] || '#C8C4BE',
                  marginLeft: '-8px',
                  marginRight: '-8px',
                  marginTop: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <div style={{ 
                    color: '#000000', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>{p.d}</div>
                  <span style={{ color: '#000000', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>| {p.n}</span>
                </div>
                {/* Información */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                  <div className="core-cprice" style={{ flexShrink: 0, textAlign: 'right' }}>$ {separatePrice(p.p)}</div>
                </div>
                {/* Descripción */}
                <div className="core-panel-desc">{p.desc}</div>
                {/* Preguntas y respuestas */}
                {(() => {
                  const questions = [
                    { q: '¿Cuál es el estado del producto?', a: 'El producto está en excelente estado, con uso mínimo.' },
                    { q: '¿Hace envíos?', a: 'Sí, realizo envíos a todo el país.' },
                    { q: '¿Acepta cambios?', a: 'No se aceptan cambios, solo venta final.' }
                  ];
                  return questions.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < questions.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '4px', color: '#000' }}>{item.q}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>{item.a}</div>
                    </div>
                  ));
                })()}
                {/* Valoración y nombre de usuario */}
                <div style={{
                  position: 'absolute',
                  bottom: '12.5%',
                  left: '8px',
                  right: '8px',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  zIndex: 10
                }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#000',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left'
                  }}>
                    {p.sellerName || 'Vendedor'}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} style={{ color: i <= Math.round(p.r) ? '#FFD700' : '#C8C4BE', fontSize: '12px' }}>
                        ★
                      </span>
                    ))}
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', marginLeft: '4px' }}>{p.r.toFixed(1)}</span>
                  </div>
                </div>
                <div className="core-bottom">
                  <button className="core-add-btn" onClick={handleAdd} disabled={p.stock === 0} style={p.stock === 0 ? { background: '#ccc', cursor: 'not-allowed', color: '#888' } : style}>
              {p.stock === 0 ? 'Sin stock' : label}
            </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: usar slide (comportamiento original)
  return (
    <div className={`core-card-slot${isOpen ? ' panel-open' : ''}`}>
      {/* Static card */}
      <div
        id={`ec${p.id}`}
        className={`core-ec${isOpen ? ' sh-open' : ''}`}
        onClick={handleToggle}
      >
        {/* ── FRONT FACE (igual estructura que Market) ── */}
        <div className="core-top">
          <div className="core-cimg">
            {playing && playingVideoIndex !== null && videoArray[playingVideoIndex] ? (
              <>
              <video
                  ref={videoRef}
                className="core-vid-frame"
                  src={videoArray[playingVideoIndex] || ''}
                  autoPlay={!isPaused}
                  muted={isMuted}
                  playsInline
                  loop={false}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '102%',
                    height: '102%',
                    objectFit: 'cover',
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    outline: 'none',
                    minWidth: '100%',
                    minHeight: '100%'
                  }}
                  onClick={handleVideoCenterClick}
                />
                {/* Flecha de volver - Esquina superior derecha */}
                {showBackArrow && (
                  <button
                    onClick={handleCloseVideo}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      zIndex: 6,
                      background: iconColor === '#333' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    <IconBack color={iconColor} />
                  </button>
                )}
                {/* Controles de video - Esquina inferior izquierda */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  zIndex: 5,
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  backgroundColor: iconColor === '#333' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  backdropFilter: 'blur(4px)'
                }}>
                  <button onClick={(e) => handleVideoControl('rewind', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                    <IconRewind color={iconColor} />
                  </button>
                  <button onClick={(e) => handleVideoControl(isPaused ? 'play' : 'pause', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                    {isPaused ? <IconPlayTriangle filled color={iconColor} /> : <IconPause color={iconColor} />}
                  </button>
                  <button onClick={(e) => handleVideoControl('forward', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                    <IconForward color={iconColor} />
                  </button>
                  <button onClick={(e) => handleVideoControl('speed1.5', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: iconColor, fontSize: '11px', fontWeight: 600 }}>1.5x</button>
                  <button onClick={(e) => handleVideoControl('speed2', e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: iconColor, fontSize: '11px', fontWeight: 600 }}>2x</button>
                </div>
                {/* Controles de volumen - Esquina inferior derecha */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  zIndex: 5,
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <button 
                    onClick={handleVolumeIconClick}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconVolume color={iconColor} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      width: '60px', 
                      height: '3px', 
                      cursor: 'pointer',
                      accentColor: iconColor === '#333' ? '#333' : '#fff',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      background: iconColor === '#333' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
                      borderRadius: '2px',
                      outline: 'none'
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <img src={p.img} alt={p.n} ref={imgRef} />
                {/* Valoración - Esquina superior izquierda */}
                {!playing && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '8px', 
                    left: '8px', 
                    zIndex: 4 
                  }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <span key={i} style={{ color: i <= Math.round(p.r) ? '#FFD700' : '#C8C4BE', fontSize: '12px' }}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Indicadores de video - Esquina superior derecha */}
                {videoArray.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 4,
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                  }}>
                    {videoArray.map((vid, idx) => (
                  <button
                        key={idx}
                        onClick={(e) => handleVideoClick(idx, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: vid ? 'pointer' : 'default',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: vid ? 1 : 0.5
                        }}
                      >
                        <IconPlayTriangle filled={!!vid} color={iconColor} />
                  </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="core-dept-label">{p.d}</div>
          </div>
        </div>

        <div
          className="core-divider"
          style={{ backgroundColor: deptColors[p.d] }}
        />

        <div className="core-middle">
          <div className="core-title">{p.n}</div>
          <div className="core-price">$ {p.p}</div>
        </div>

        <div className="core-bottom">
          <button className="core-add-btn" onClick={handleAdd} disabled={p.stock === 0} style={p.stock === 0 ? { background: '#ccc', cursor: 'not-allowed', color: '#888' } : style}>
              {p.stock === 0 ? 'Sin stock' : label}
            </button>
        </div>
      </div>

      {/* Sliding panel */}
      <div className={`core-panel-wrap dir-${dir}${isOpen ? ' open' : ''}`}>
        <div className="core-panel-inner">
          <img className="core-ghost-img" src={selectedImage} alt="" aria-hidden="true" />
          <div className="core-panel-body">
            {/* Miniaturas */}
            <div className="core-panel-miniatures" style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              marginBottom: '0px',
              width: '100%'
            }}>
              {articleImages.map((img, idx) => (
                <div 
                  key={`mini-${p.id}-${idx}`} 
                  onClick={img ? (e) => { 
                    e.stopPropagation(); 
                    setSelectedImageIndex(idx); 
                  } : undefined}
                  style={{ 
                    width: '100%', 
                    aspectRatio: '1 / 1',
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    border: img && selectedImageIndex === idx 
                      ? '2px solid color-mix(in srgb, var(--color-success) 70%, white)' 
                      : img 
                        ? '1.5px solid rgba(255,255,255,0.3)' 
                        : SHOW_EMPTY_THUMBNAIL_BORDERS 
                          ? '1px solid rgba(107, 184, 122, 0.3)' 
                          : 'none',
                    cursor: img ? 'pointer' : 'default',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: img ? (selectedImageIndex === idx ? 1 : 0.8) : (SHOW_EMPTY_THUMBNAIL_BORDERS ? 1 : 0),
                    backgroundColor: img ? 'transparent' : (SHOW_EMPTY_THUMBNAIL_BORDERS ? 'rgba(107, 184, 122, 0.05)' : 'transparent'),
                  }}
                  onMouseEnter={img ? (e) => {
                    if (selectedImageIndex !== idx) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.opacity = '1';
                    }
                  } : undefined}
                  onMouseLeave={img ? (e) => {
                    if (selectedImageIndex !== idx) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.opacity = '0.8';
                    }
                  } : undefined}
                >
                  {img ? (
                    <img 
                      src={img} 
                      alt={`${p.n} - Foto ${idx + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        aspectRatio: '1 / 1'
                      }}
                    />
                  ) : null}
            </div>
              ))}
            </div>
            {/* Barra de color del departamento */}
            <div style={{ 
              width: 'calc(100% + 16px)', 
              height: '11.5px', 
              backgroundColor: deptColors[p.d] || '#C8C4BE',
              marginLeft: '-8px',
              marginRight: '-8px',
              marginTop: '8px',
              marginBottom: '8px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ 
                color: '#000000', 
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>{p.d}</div>
            </div>
            {/* Información igual a la primera tarjeta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', gap: '8px' }}>
                <div className="core-cname" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.n}</div>
                <div className="core-cprice" style={{ flexShrink: 0, textAlign: 'right' }}>$ {separatePrice(p.p)}</div>
              </div>
            </div>
            <div className="core-panel-desc">{p.desc}</div>
          </div>
          {/* Barra de preguntas - posicionada a la altura del divider (25% desde abajo) */}
          {(() => {
            // Parsear preguntas: pueden venir como string separado por | o como array
            const questions = typeof p.q === 'string' && p.q 
              ? p.q.split('|').filter(q => q.trim()) 
              : Array.isArray(p.q) 
                ? p.q.filter(q => q && q.trim())
                : [];
            const lastThreeQuestions = questions.slice(-3);
            
            if (lastThreeQuestions.length === 0) return null;
            
            // Formatear fecha de hoy dd/mm/aa
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = String(today.getFullYear()).slice(-2);
            const todayFormatted = `${day}/${month}/${year}`;
            
            return (
              <div style={{ 
                position: 'absolute',
                top: '75%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                height: '13px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                overflow: 'hidden',
                width: 'calc(100% - 16px)',
                maxWidth: 'calc(100% - 16px)',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                borderRadius: '4px',
                padding: '0 4px',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: 0 }}>
                  {lastThreeQuestions.map((question, idx) => (
                    <div 
                      key={idx}
                      style={{
                        flex: '1',
                        fontSize: '9px',
                        color: '#000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '13px',
                        padding: '0 4px'
                      }}
                      title={question}
                    >
                      {question}
                    </div>
                  ))}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {todayFormatted}
                </div>
              </div>
            );
          })()}
          {/* Valoración y nombre de usuario - entre pregunta y botón */}
          <div style={{
            position: 'absolute',
            bottom: '12.5%',
            left: '8px',
            right: '8px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            zIndex: 10
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
              textAlign: 'left'
            }}>
              {p.sellerName || 'Vendedor'}
            </div>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ color: i <= Math.round(p.r) ? '#FFD700' : '#C8C4BE', fontSize: '12px' }}>
                  ★
                </span>
              ))}
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', marginLeft: '4px' }}>{p.r.toFixed(1)}</span>
            </div>
          </div>
          <div className="core-bottom">
            <button className="core-add-btn" onClick={handleAdd} disabled={p.stock === 0} style={p.stock === 0 ? { background: '#ccc', cursor: 'not-allowed', color: '#888' } : style}>
              {p.stock === 0 ? 'Sin stock' : label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cross-sell sticky bar ─────────────────────────────────────────────────────

export { SlideCard };


