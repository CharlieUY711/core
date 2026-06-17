/**
 * ─────────────────────────────────────────────────────────────────
 *  AddressGeo  –  Módulo independiente de dirección y geoposicionamiento
 * ─────────────────────────────────────────────────────────────────
 *  Instalación:
 *    npm install mapbox-gl
 *    npm install --save-dev @types/mapbox-gl
 *
 *  Configuración:
 *    Necesitás un token de Mapbox:  https://account.mapbox.com/
 *    Pasalo como prop o definí la variable de entorno VITE_MAPBOX_TOKEN
 *
 *  Exportaciones:
 *    AddressGeoWidget     – Widget completo (formulario + mapa)
 *    AddressAutocomplete  – Solo el input de búsqueda con sugerencias
 *    AddressMap           – Solo el mapa interactivo
 *    AddressCard          – Tarjeta de visualización de dirección guardada
 *    useGeolocation       – Hook para obtener ubicación del usuario
 *    reverseGeocode       – Función: coords → dirección
 *    forwardGeocode       – Función: texto → coords
 *
 *  Uso del widget completo:
 *    <AddressGeoWidget
 *      mapboxToken="pk.eyJ1..."
 *      onSave={(address) => console.log(address)}
 *    />
 *
 *  Uso como slot en UserProfile:
 *    <UserProfile
 *      userId="uuid"
 *      AddressWidget={({ addresses, onChange, accentColor }) => (
 *        <AddressGeoWidget
 *          mapboxToken="pk.eyJ1..."
 *          addresses={addresses}
 *          onAddressesChange={onChange}
 *          accentColor={accentColor}
 *        />
 *      )}
 *    />
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Address {
  id:            string;
  label:         string;
  street:        string;
  doorNumber?:   string;
  corner?:       string;
  apartment?:    string;
  indicaciones?: string;
  city:          string;
  zip:           string;
  lat?:          number;
  lng?:          number;
  isDefault:     boolean;
}

export interface GeoResult {
  address: string;
  lat:     number;
  lng:     number;
  city?:   string;
  corner?: string;
}

// ─── Helpers: Geocoding API ───────────────────────────────────────────────────

export async function reverseGeocode(lng: number, lat: number, token: string): Promise<GeoResult> {
  const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es&types=address&limit=1`);
  const data = await res.json();
  const feat = data.features?.[0];
  if (!feat) return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };

  const parts = feat.place_name.split(",");
  const city  = parts.length > 1 ? parts[parts.length - 3]?.trim() || "" : "";

  // Calles cercanas (esquina)
  let corner = "";
  try {
    const resR  = await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=60&limit=10&layers=road&access_token=${token}`);
    const dataR = await resR.json();
    const main  = feat.text || "";
    const roads = [...new Set(
      dataR.features?.map((f: any) => f.properties?.name)
        .filter((n: any) => n && n !== main && !n.match(/^\d/))
    )].slice(0, 2) as string[];
    if (roads.length > 0) corner = `entre ${roads.join(" y ")}`;
  } catch {}

  return { address: feat.place_name, lat, lng, city, corner };
}

export async function forwardGeocode(query: string, token: string, proximity?: [number, number]): Promise<GeoResult[]> {
  const prox = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : "&proximity=-56.1645,-34.9011";
  const url  = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&language=es&limit=6${prox}&types=address,place,neighborhood`;
  const res  = await fetch(url);
  const data = await res.json();
  return (data.features || []).map((f: any) => ({
    address: f.place_name,
    lat:     f.center[1],
    lng:     f.center[0],
  }));
}

// ─── Hook: Geolocalización ────────────────────────────────────────────────────

export function useGeolocation(fallback: [number, number] = [-56.1645, -34.9011]) {
  const [coords,   setCoords]   = useState<[number, number] | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(fallback); setLoading(false);
      setError("Geolocalización no disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords([pos.coords.longitude, pos.coords.latitude]); setLoading(false); },
      ()  => { setCoords(fallback); setLoading(false); setError("Permiso denegado"); }
    );
  }, []);

  return { coords, loading, error };
}

// ─── AddressAutocomplete ──────────────────────────────────────────────────────

interface AutocompleteProps {
  value:        string;
  onChange:     (v: string) => void;
  onSelect:     (r: GeoResult) => void;
  mapboxToken:  string;
  placeholder?: string;
  disabled?:    boolean;
  accentColor?: string;
  proximity?:   [number, number];
}

export function AddressAutocomplete({
  value, onChange, onSelect, mapboxToken,
  placeholder = "Escribí tu dirección...",
  disabled, accentColor = "#FF7A00", proximity,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [focused,     setFocused]     = useState(false);
  const [showList,    setShowList]    = useState(false);
  const debounceRef = useRef<any>(null);
  const { coords } = useGeolocation();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const prox = proximity || (coords ? [coords[0], coords[1]] as [number, number] : undefined);
      const results = await forwardGeocode(q, mapboxToken, prox);
      setSuggestions(results.map((r, i) => ({ ...r, id: i }))); // simplified
      // Re-fetch raw features for display
      const prox2 = prox ? `&proximity=${prox[0]},${prox[1]}` : "&proximity=-56.1645,-34.9011";
      const raw = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}&language=es&limit=6${prox2}&types=address,place,neighborhood`);
      const data = await raw.json();
      setSuggestions(data.features || []);
      setShowList(true);
    } catch { setSuggestions([]); }
    setLoading(false);
  }, [coords, mapboxToken, proximity]);

  const handleChange = (v: string) => {
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
    if (!v) { setSuggestions([]); setShowList(false); }
  };

  const handleSelect = async (item: any) => {
    const address = item.place_name;
    const [lng, lat] = item.center;
    onChange(address);
    // Enriquecer con esquinas
    const result = await reverseGeocode(lng, lat, mapboxToken);
    onSelect({ ...result, address });
    setSuggestions([]); setShowList(false);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { longitude: lng, latitude: lat } = pos.coords;
      try {
        const result = await reverseGeocode(lng, lat, mapboxToken);
        onChange(result.address);
        onSelect(result);
      } catch {}
      setLoading(false);
    }, () => setLoading(false));
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", pointerEvents: "none", zIndex: 1 }}>📍</span>
      <input value={value} onChange={e => handleChange(e.target.value)} disabled={disabled}
        placeholder={placeholder}
        onFocus={() => { setFocused(true); if (suggestions.length) setShowList(true); }}
        onBlur={() => { setFocused(false); setTimeout(() => setShowList(false), 200); }}
        style={{ width: "100%", padding: "0.7rem 2.75rem 0.7rem 2.5rem", border: `1.5px solid ${focused ? accentColor : "#E5E7EB"}`, borderRadius: "10px", fontSize: "0.9rem", outline: "none", background: disabled ? "#F9FAFB" : "#fff", boxShadow: focused ? `0 0 0 3px ${accentColor}1A` : "none", transition: "all 0.15s", boxSizing: "border-box" }} />
      <button onClick={handleGeolocate} disabled={loading} title="Usar mi ubicación"
        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: "1rem", color: loading ? "#9CA3AF" : accentColor, padding: "4px", transition: "all 0.15s" }}>
        {loading ? "⌛" : "🎯"}
      </button>
      {showList && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          {suggestions.map((item, i) => {
            const main    = item.text || item.place_name?.split(",")[0];
            const context = item.place_name?.split(",").slice(1, 3).join(",");
            return (
              <div key={item.id || i} onMouseDown={() => handleSelect(item)}
                style={{ padding: "0.65rem 1rem", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}
                onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}0D`)}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                <span style={{ fontSize: "0.85rem", flexShrink: 0, marginTop: "2px" }}>📍</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#111", fontSize: "0.875rem", lineHeight: 1.3 }}>{main}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: "1px" }}>{context}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AddressMap ───────────────────────────────────────────────────────────────

interface MapProps {
  lat:               number;
  lng:               number;
  zoom?:             number;
  height?:           string;
  interactive?:      boolean;
  mapboxToken:       string;
  accentColor?:      string;
  onLocationChange?: (result: GeoResult) => void;
}

export function AddressMap({
  lat, lng, zoom = 15, height = "100%",
  interactive = false, mapboxToken, accentColor = "#FF7A00",
  onLocationChange,
}: MapProps) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapObj    = useRef<any>(null);
  const markerObj = useRef<any>(null);
  const initRef   = useRef(false);

  useEffect(() => {
    if (initRef.current || !mapRef.current || !lat || !lng) return;
    initRef.current = true;

    // Importar mapbox-gl dinámicamente
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom,
        interactive,
      });

      if (interactive) {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right");
      }

      // Marker personalizado
      const el = document.createElement("div");
      el.style.cssText = `width:22px;height:22px;background:${accentColor};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px ${accentColor}80;cursor:${interactive ? "grab" : "default"};transition:transform 0.15s;`;

      const marker = new mapboxgl.Marker({ element: el, draggable: interactive })
        .setLngLat([lng, lat])
        .addTo(map);

      if (interactive && onLocationChange) {
        const doReverseGeocode = async (lngVal: number, latVal: number) => {
          const result = await reverseGeocode(lngVal, latVal, mapboxToken);
          onLocationChange(result);
        };

        map.on("click", (e: any) => {
          const { lng: lngVal, lat: latVal } = e.lngLat;
          marker.setLngLat([lngVal, latVal]);
          doReverseGeocode(lngVal, latVal);
        });

        marker.on("dragend", () => {
          const { lng: lngVal, lat: latVal } = marker.getLngLat();
          doReverseGeocode(lngVal, latVal);
        });

        // Hint visual
        const hint = document.createElement("div");
        hint.innerHTML = "📍 Hacé click o arrastrá el pin para ajustar";
        hint.style.cssText = "position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;pointer-events:none;white-space:nowrap;z-index:10;";
        mapRef.current!.style.position = "relative";
        mapRef.current!.appendChild(hint);
        setTimeout(() => { hint.style.opacity = "0"; hint.style.transition = "opacity 1s"; }, 3000);
        setTimeout(() => hint.remove(), 4000);
      }

      mapObj.current    = map;
      markerObj.current = marker;
    });

    return () => { mapObj.current?.remove(); initRef.current = false; };
  }, []);

  // Actualizar posición cuando cambian coords externamente
  useEffect(() => {
    if (!mapObj.current || !lat || !lng) return;
    mapObj.current.flyTo({ center: [lng, lat], zoom, speed: 1.2 });
    markerObj.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return <div ref={mapRef} style={{ width: "100%", height, borderRadius: "10px", overflow: "hidden", minHeight: "220px" }} />;
}

// ─── AddressCard ──────────────────────────────────────────────────────────────

interface CardProps {
  address:     Address;
  mapboxToken: string;
  accentColor?: string;
  onDefault:   (id: string) => void;
  onEdit:      (id: string) => void;
  onDelete:    (id: string) => void;
}

export function AddressCard({ address, mapboxToken, accentColor = "#FF7A00", onDefault, onEdit, onDelete }: CardProps) {
  const [hov, setHov] = useState(false);
  const [del, setDel] = useState(false);
  const ICONS: Record<string, string> = { Casa: "🏠", Trabajo: "💼", Otro: "📌" };

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ border: `1.5px solid ${address.isDefault ? accentColor : hov ? "#CBD5E1" : "#E5E7EB"}`, borderRadius: "14px", overflow: "hidden", background: "#fff", boxShadow: hov ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.2s" }}>
      {address.lat && address.lng
        ? <AddressMap lat={address.lat} lng={address.lng} mapboxToken={mapboxToken} height="130px" accentColor={accentColor} />
        : <div style={{ height: "80px", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🗺️</div>
      }
      <div style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
          <span>{ICONS[address.label] || "📌"}</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{address.label}</span>
          {address.isDefault && <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "20px", fontSize: "0.65rem", fontWeight: 700, background: accentColor, color: "#fff" }}>Predeterminada</span>}
        </div>
        <div style={{ color: "#6B7280", fontSize: "0.8rem" }}>
          {address.street}{address.city ? `, ${address.city}` : ""}
          {address.corner && <span style={{ display: "block", fontSize: "0.75rem", color: "#9CA3AF", marginTop: "2px" }}>{address.corner}</span>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem" }}>
          {!address.isDefault && <button onClick={() => onDefault(address.id)} style={{ flex: 1, padding: "5px 0", background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}4D`, borderRadius: "7px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>Predeterminar</button>}
          <button onClick={() => onEdit(address.id)} style={{ flex: 1, padding: "5px 0", background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "7px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>✏️ Editar</button>
          {del
            ? <><button onClick={() => onDelete(address.id)} style={{ flex: 1, padding: "5px 0", background: "#EF4444", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>Confirmar</button><button onClick={() => setDel(false)} style={{ padding: "5px 8px", background: "#f1f5f9", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.72rem" }}>✕</button></>
            : <button onClick={() => setDel(true)} style={{ padding: "5px 10px", background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "7px", cursor: "pointer", fontSize: "0.72rem" }}>🗑</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── AddressGeoWidget (completo) ──────────────────────────────────────────────

interface WidgetProps {
  mapboxToken:         string;
  addresses?:          Address[];
  onAddressesChange?:  (addresses: Address[]) => void;
  accentColor?:        string;
  fallbackCoords?:     [number, number]; // [lng, lat]
}

export default function AddressGeoWidget({
  mapboxToken,
  addresses: externalAddresses,
  onAddressesChange,
  accentColor = "#FF7A00",
  fallbackCoords = [-56.1645, -34.9011],
}: WidgetProps) {
  const [addresses, setAddresses] = useState<Address[]>(externalAddresses || []);
  const [adding,    setAdding]    = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [delId,     setDelId]     = useState<string | null>(null);
  const [form,      setForm]      = useState<Partial<Address> & { lat: number; lng: number }>({
    label: "Casa", street: "", doorNumber: "", corner: "", apartment: "", indicaciones: "", city: "", zip: "",
    lat: fallbackCoords[1], lng: fallbackCoords[0],
  });

  // Sync externo
  useEffect(() => { if (externalAddresses) setAddresses(externalAddresses); }, [externalAddresses]);
  const updateAddresses = (next: Address[]) => { setAddresses(next); onAddressesChange?.(next); };

  const { coords } = useGeolocation(fallbackCoords);

  // Geolocalizar al abrir formulario
  useEffect(() => {
    if ((adding || editId) && coords && !form.lat) {
      setForm(p => ({ ...p, lat: coords[1], lng: coords[0] }));
    }
  }, [adding, editId, coords]);

  const hasCoords = !!(form.lat && form.lng);

  const handleAdd = () => {
    if (!form.street) return;
    const newAddr: Address = {
      id: Date.now().toString(), label: form.label || "Casa",
      street: form.street, doorNumber: form.doorNumber, corner: form.corner,
      apartment: form.apartment, indicaciones: form.indicaciones,
      city: form.city || "", zip: form.zip || "",
      lat: form.lat, lng: form.lng, isDefault: addresses.length === 0,
    };
    updateAddresses([...addresses, newAddr]);
    resetForm(); setAdding(false);
  };

  const handleEdit = () => {
    updateAddresses(addresses.map(a => a.id === editId ? { ...a, ...form } as Address : a));
    setEditId(null); resetForm();
  };

  const resetForm = () => setForm({ label: "Casa", street: "", doorNumber: "", corner: "", apartment: "", indicaciones: "", city: "", zip: "", lat: fallbackCoords[1], lng: fallbackCoords[0] });

  const openEdit = (id: string) => {
    const a = addresses.find(x => x.id === id);
    if (a) { setForm({ ...a, lat: a.lat || fallbackCoords[1], lng: a.lng || fallbackCoords[0] }); setEditId(id); setAdding(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111" }}>Mis direcciones</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.8rem", marginTop: "2px" }}>Gestioná tus ubicaciones con validación de mapa</div>
        </div>
        {!adding && !editId && (
          <button onClick={() => setAdding(true)} style={{ padding: "0.5rem 1rem", background: accentColor, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
            + Agregar dirección
          </button>
        )}
      </div>

      {/* Formulario */}
      {(adding || editId) && (
        <div style={{ background: "#FFF8F5", border: `2px solid ${accentColor}`, borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid #FFE0CC", fontWeight: 700, color: accentColor, fontSize: "0.9rem" }}>
            {editId ? "✏️ Editar dirección" : "📍 Nueva dirección"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {/* Formulario lado izquierdo */}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem", overflowY: "auto", maxHeight: "520px" }}>
              {/* Etiqueta */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Etiqueta</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {["Casa", "Trabajo"].map(l => (
                    <button key={l} onClick={() => setForm(p => ({ ...p, label: l }))}
                      style={{ padding: "0.45rem 1rem", border: `1.5px solid ${form.label === l ? accentColor : "#E5E7EB"}`, background: form.label === l ? `${accentColor}14` : "#fff", color: form.label === l ? accentColor : "#6B7280", borderRadius: "8px", cursor: "pointer", fontWeight: form.label === l ? 700 : 400, fontSize: "0.82rem" }}>
                      {l === "Casa" ? "🏠" : "💼"} {l}
                    </button>
                  ))}
                  <input value={!["Casa", "Trabajo"].includes(form.label || "") ? (form.label || "") : ""} onChange={e => setForm(p => ({ ...p, label: e.target.value || "Otro" }))} placeholder="📌 Otro..." style={{ flex: 1, padding: "0.45rem 0.75rem", border: `1.5px solid ${!["Casa", "Trabajo"].includes(form.label || "") ? accentColor : "#E5E7EB"}`, borderRadius: "8px", fontSize: "0.82rem", outline: "none" }} />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>
                  Calle <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(buscá o mové el mapa →)</span>
                </label>
                <AddressAutocomplete
                  value={form.street || ""}
                  onChange={v => setForm(p => ({ ...p, street: v }))}
                  onSelect={result => setForm(p => ({ ...p, street: result.address, lat: result.lat, lng: result.lng, city: result.city || p.city, corner: result.corner || p.corner }))}
                  mapboxToken={mapboxToken}
                  accentColor={accentColor}
                  placeholder="Ej: Convención 1267"
                />
              </div>

              {/* Nro puerta + Esquina */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Nº de puerta</label>
                  <input value={form.doorNumber || ""} onChange={e => setForm(p => ({ ...p, doorNumber: e.target.value }))} placeholder="Ej: 1267"
                    style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = accentColor}
                    onBlur={async e => {
                      e.target.style.borderColor = "#E5E7EB";
                      const num = e.target.value.trim();
                      if (!num || !form.street) return;
                      const base = (form.street || "").split(",")[0].replace(/\d+/g, "").trim();
                      const q    = encodeURIComponent(`${base} ${num}, ${form.city || "Montevideo"}`);
                      try {
                        const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${mapboxToken}&language=es&limit=1&types=address`);
                        const data = await res.json();
                        const feat = data.features?.[0];
                        if (feat) {
                          const [lngVal, latVal] = feat.center;
                          const result = await reverseGeocode(lngVal, latVal, mapboxToken);
                          setForm(p => ({ ...p, street: feat.place_name, lat: latVal, lng: lngVal, city: result.city || p.city, corner: result.corner || p.corner }));
                        }
                      } catch {}
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Esquina / entre calles</label>
                  <input value={form.corner || ""} onChange={e => setForm(p => ({ ...p, corner: e.target.value }))} placeholder="Auto-detectada"
                    style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                </div>
              </div>

              {/* Apto + Ciudad */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Nº de apartamento</label>
                  <input value={form.apartment || ""} onChange={e => setForm(p => ({ ...p, apartment: e.target.value }))} placeholder="Ej: Apto 302" style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Ciudad</label>
                  <input value={form.city || ""} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Ej: Montevideo" style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                </div>
              </div>

              {/* CP + Indicaciones */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Código postal</label>
                  <input value={form.zip || ""} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} placeholder="Ej: 11300" style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Indicaciones de entrega</label>
                  <input value={form.indicaciones || ""} onChange={e => setForm(p => ({ ...p, indicaciones: e.target.value }))} placeholder="Ej: Timbre roto, llamar al llegar" style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                </div>
              </div>

              {/* Badge de validación */}
              {hasCoords
                ? <div style={{ padding: "0.5rem 0.75rem", background: "#f0fdf4", border: "1px solid #6BB87A", borderRadius: "8px", fontSize: "0.78rem", color: "#166534", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    ✅ Validada · {form.lat?.toFixed(4)}, {form.lng?.toFixed(4)}
                    {form.corner && <span style={{ color: "#6B7280" }}>· {form.corner}</span>}
                  </div>
                : <div style={{ padding: "0.5rem 0.75rem", background: "#fffbeb", border: "1px solid #FCD34D", borderRadius: "8px", fontSize: "0.78rem", color: "#92400e" }}>
                    📍 Buscá una dirección o hacé click en el mapa
                  </div>
              }

              {/* Botones */}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => { resetForm(); setAdding(false); setEditId(null); }} style={{ padding: "0.55rem 1rem", background: "transparent", border: "1.5px solid #E5E7EB", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", color: "#6B7280" }}>Cancelar</button>
                <button onClick={editId ? handleEdit : handleAdd} disabled={!form.street?.trim()} style={{ padding: "0.55rem 1.25rem", background: !form.street?.trim() ? "#ccc" : accentColor, color: "#fff", border: "none", borderRadius: "8px", cursor: !form.street?.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                  {editId ? "Guardar cambios" : "Agregar dirección"}
                </button>
              </div>
            </div>

            {/* Mapa */}
            <div style={{ borderLeft: "1px solid #FFE0CC", display: "flex", flexDirection: "column", minHeight: "400px" }}>
              <div style={{ padding: "0.6rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", borderBottom: "1px solid #FFE0CC", background: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🗺️ {hasCoords ? "Ajustá el pin o hacé click en el mapa" : "Detectando tu ubicación..."}
              </div>
              <div style={{ flex: 1 }}>
                <AddressMap
                  lat={form.lat || fallbackCoords[1]}
                  lng={form.lng || fallbackCoords[0]}
                  height="100%"
                  interactive
                  mapboxToken={mapboxToken}
                  accentColor={accentColor}
                  onLocationChange={result => setForm(p => ({ ...p, street: result.address, lat: result.lat, lng: result.lng, city: result.city || p.city, corner: result.corner || p.corner }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {addresses.length === 0 && !adding && !editId ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: "12px", border: "1.5px dashed #E5E7EB" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📍</div>
          <div style={{ fontWeight: 700, color: "#374151", marginBottom: "0.25rem" }}>Sin direcciones</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Agregá una dirección para facilitar tus compras</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              mapboxToken={mapboxToken}
              accentColor={accentColor}
              onDefault={id => updateAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })))}
              onEdit={openEdit}
              onDelete={id => { updateAddresses(addresses.filter(a => a.id !== id)); setDelId(null); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
