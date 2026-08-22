import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  lat:       number;
  lng:       number;
  zoom?:     number;
  height?:   string;
  interactive?: boolean;
  onLocationChange?: (result: { address: string; lat: number; lng: number }) => void;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function AddressMap({ lat, lng, zoom=15, height="100%", interactive=false, onLocationChange }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapObj    = useRef<mapboxgl.Map | null>(null);
  const markerObj = useRef<mapboxgl.Marker | null>(null);
  const initRef   = useRef(false);

  useEffect(() => {
    if (initRef.current || !mapRef.current || !lat || !lng) return;
    initRef.current = true;

    const map = new mapboxgl.Map({
      container:   mapRef.current,
      style:       "mapbox://styles/mapbox/streets-v12",
      center:      [lng, lat],
      zoom,
      interactive, // drag, zoom, etc.
    });

    if (interactive) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }), "top-right");
    }

    // Marker naranja
    const el = document.createElement("div");
    el.style.cssText = `
      width:22px;height:22px;
      background:var(--brand-madre);
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 10px color-mix(in srgb, var(--brand-madre) 50%, transparent);
      cursor:${interactive?"grab":"default"};
      transition:transform 0.15s;
    `;

    const marker = new mapboxgl.Marker({ element: el, draggable: interactive })
      .setLngLat([lng, lat])
      .addTo(map);

    // Click en el mapa → mover marker + reverse geocode
    if (interactive && onLocationChange) {
      const reverseGeocode = async (lngVal: number, latVal: number) => {
        try {
          const res  = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngVal},${latVal}.json?access_token=${mapboxgl.accessToken}&language=es&types=address`
          );
          const data = await res.json();
          const feat = data.features?.[0];
          if (feat) onLocationChange({ address: feat.place_name, lat: latVal, lng: lngVal });
          else onLocationChange({ address: `${latVal.toFixed(5)}, ${lngVal.toFixed(5)}`, lat: latVal, lng: lngVal });
        } catch {}
      };

      // Click en mapa
      map.on("click", (e) => {
        const { lng: lngVal, lat: latVal } = e.lngLat;
        marker.setLngLat([lngVal, latVal]);
        reverseGeocode(lngVal, latVal);
      });

      // Drag del marker
      marker.on("dragend", () => {
        const { lng: lngVal, lat: latVal } = marker.getLngLat();
        reverseGeocode(lngVal, latVal);
      });

      // Hint visual
      const hint = document.createElement("div");
      hint.innerHTML = "📍 Hacé click o arrastrá el pin para ajustar";
      hint.style.cssText = `
        position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.65);color:#fff;
        padding:4px 12px;border-radius:20px;font-size:11px;
        pointer-events:none;white-space:nowrap;z-index:10;
      `;
      mapRef.current!.style.position = "relative";
      mapRef.current!.appendChild(hint);
      setTimeout(() => { hint.style.opacity = "0"; hint.style.transition = "opacity 1s"; }, 3000);
      setTimeout(() => hint.remove(), 4000);
    }

    mapObj.current  = map;
    markerObj.current = marker;

    return () => { map.remove(); initRef.current = false; };
  }, []);

  // Actualizar posición cuando cambian coords externamente
  useEffect(() => {
    if (!mapObj.current || !lat || !lng) return;
    mapObj.current.flyTo({ center: [lng, lat], zoom, speed: 1.2 });
    markerObj.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div ref={mapRef} style={{ width:"100%", height, borderRadius:"10px", overflow:"hidden", minHeight:"220px" }} />
  );
}


