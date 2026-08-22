import { useState, useRef, useEffect, useCallback } from "react";

interface Result { address: string; lat: number; lng: number; }
interface Props {
  value:        string;
  onChange:     (v: string) => void;
  onSelect:     (r: Result) => void;
  placeholder?: string;
  disabled?:    boolean;
}

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [focused,     setFocused]     = useState(false);
  const [showList,    setShowList]    = useState(false);
  const [userCoords,  setUserCoords]  = useState<[number,number] | null>(null);
  const debounceRef = useRef<any>(null);

  // Geolocalización automática al montar
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserCoords([pos.coords.longitude, pos.coords.latitude]),
      ()  => setUserCoords([-56.1645, -34.9011]) // Fallback Montevideo
    );
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const proximity = userCoords ? `&proximity=${userCoords[0]},${userCoords[1]}` : "&proximity=-56.1645,-34.9011";
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${TOKEN}&language=es&limit=6${proximity}&types=address,place,neighborhood`;
      const res  = await fetch(url);
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowList(true);
    } catch { setSuggestions([]); }
    setLoading(false);
  }, [userCoords]);

  const handleChange = (v: string) => {
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
    if (!v) { setSuggestions([]); setShowList(false); }
  };

  const handleSelect = (item: any) => {
    const address = item.place_name;
    const [lng, lat] = item.center;
    onChange(address);
    onSelect({ address, lat, lng });
    setSuggestions([]); setShowList(false);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { longitude: lng, latitude: lat } = pos.coords;
      setUserCoords([lng, lat]);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&language=es&types=address`;
        const res  = await fetch(url);
        const data = await res.json();
        const feat = data.features?.[0];
        if (feat) {
          onChange(feat.place_name);
          onSelect({ address: feat.place_name, lat, lng });
        }
      } catch {}
      setLoading(false);
    }, () => setLoading(false));
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div style={{ position:"relative" }}>
      <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"1rem", pointerEvents:"none", zIndex:1 }}>📍</span>
      <input value={value} onChange={e=>handleChange(e.target.value)} disabled={disabled}
        placeholder={placeholder || "Escribí tu dirección..."}
        onFocus={()=>{ setFocused(true); if(suggestions.length) setShowList(true); }}
        onBlur={()=>{ setFocused(false); setTimeout(()=>setShowList(false), 200); }}
        style={{ width:"100%", padding:"0.7rem 2.75rem 0.7rem 2.5rem",
          border:`1.5px solid ${focused?"var(--brand-madre)":"var(--border)"}`,
          borderRadius:"10px", fontSize:"0.9rem", outline:"none",
          background: disabled?"var(--gray-50)":"#fff",
          boxShadow: focused?"0 0 0 3px color-mix(in srgb, var(--brand-madre) 10%, transparent)":"none",
          transition:"all 0.15s", boxSizing:"border-box" }} />
      <button onClick={handleGeolocate} disabled={loading} title="Usar mi ubicación"
        style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)",
          background:"transparent", border:"none", cursor:"pointer", fontSize:"1rem",
          color: loading?"var(--gray-400)":"var(--brand-madre)", padding:"4px", transition:"all 0.15s" }}>
        {loading ? "⌛" : "🎯"}
      </button>

      {showList && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100,
          background:"#fff", border:"1.5px solid var(--border)", borderRadius:"10px",
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", overflow:"hidden" }}>
          {suggestions.map((item, i) => {
            const main    = item.text || item.place_name.split(",")[0];
            const context = item.place_name.split(",").slice(1, 3).join(",");
            return (
              <div key={item.id} onMouseDown={()=>handleSelect(item)}
                style={{ padding:"0.65rem 1rem", cursor:"pointer",
                  borderBottom: i < suggestions.length-1 ? "1px solid #F3F4F6":"none",
                  display:"flex", alignItems:"flex-start", gap:"0.5rem" }}
                onMouseEnter={e=>(e.currentTarget.style.background="#FFF8F5")}
                onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                <span style={{ fontSize:"0.85rem", flexShrink:0, marginTop:"2px" }}>📍</span>
                <div>
                  <div style={{ fontWeight:600, color:"#111", fontSize:"0.875rem", lineHeight:1.3 }}>{main}</div>
                  <div style={{ fontSize:"0.75rem", color:"var(--gray-400)", marginTop:"1px" }}>{context}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


