// traer-a-biblioteca — una imagen o un video que está afuera, adentro.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ EXISTE
// ═══════════════════════════════════════════════════════════════════════════
//
// La Biblioteca es la única fuente de medios de la tienda. Pero el alta de un
// artículo busca imágenes en la web y en los canales, y esas fotos se estaban
// guardando en `catalog_producto_base.fotos_base` como URLs ajenas: apuntaban a
// mlstatic.com, a apple.com, a kogan.com. Con eso pasaban dos cosas:
//
//   1. La Biblioteca quedaba vacía aunque el artículo tuviera ocho fotos, y en
//      Multimedia no había nada que mostrar.
//   2. Las fotos no eran nuestras. El día que ese sitio las mueve o las borra,
//      el artículo se queda sin imagen y nadie se entera hasta que un cliente
//      lo abre.
//
// Acá se traen de verdad: se descargan, se guardan en el bucket `biblioteca` y
// quedan como una fila más de `media_library`. Lo que el artículo guarda después
// es una URL nuestra.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ DEL LADO DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════
//
// Porque el navegador no puede. Bajar una imagen de otro dominio para volver a
// subirla necesita que ese dominio lo permita por CORS, y la mayoría no lo
// permite. Desde acá no hay CORS: es un pedido de servidor a servidor.
//
// LO QUE FALLA SE DICE, NO SE PIERDE
// Hay sitios que bloquean la copia (403 de hotlinking) y otros que tardan
// demasiado. Cada URL se informa por separado, con su motivo, para que quien
// llama pueda mostrarlo. Devolver una lista más corta sin decir nada sería
// perder fotos en silencio, que es la peor forma de perderlas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* Dos buckets, como la carga a mano: las imagenes y los documentos van a
   `biblioteca` y los videos a `videos`. Si esta funcion los mandara todos al
   mismo, el mismo archivo quedaria en un lugar distinto segun por donde entro. */
const BUCKET_IMAGEN = "biblioteca";
const BUCKET_VIDEO  = "videos";

/** 25 MB. Una foto de producto pesa menos; más que esto es otra cosa. */
const MAXIMO = 25 * 1024 * 1024;

/** Lo que sabemos guardar, y con qué extensión. */
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/avif": "avif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};

interface Traida {
  original: string;
  /** La URL nuestra, o la original si no se pudo traer. */
  url: string;
  /** Por qué no se pudo. Vacío si se trajo bien. */
  motivo: string;
  /** Ya estaba en la Biblioteca: no se volvió a bajar ni se duplicó. */
  yaEstaba: boolean;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Un nombre legible sacado de la URL, para que la Biblioteca no muestre uuids. */
function nombreDe(url: string, ext: string): string {
  try {
    const limpio = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    const sinExt = limpio.replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 80);
    return (sinExt || "imagen") + "." + ext;
  } catch {
    return "imagen." + ext;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: eUser } = await userClient.auth.getUser();
    if (eUser || !user) return json({ error: "Sesión no válida." }, 401);

    const { urls } = await req.json().catch(() => ({ urls: null }));
    if (!Array.isArray(urls)) return json({ error: "Falta la lista de urls." }, 400);
    if (urls.length > 30) return json({ error: "Demasiadas a la vez (máximo 30)." }, 400);

    // Lo que ya apunta a nuestros buckets no se vuelve a bajar: seria una copia
    // mas de la misma foto en cada guardado.
    const nuestros = [BUCKET_IMAGEN, BUCKET_VIDEO]
      .map(b => `${url}/storage/v1/object/public/${b}/`);

    const resultados: Traida[] = [];

    for (const original of urls) {
      if (typeof original !== "string" || !original.trim()) continue;

      if (nuestros.some(p => original.startsWith(p))) {
        resultados.push({ original, url: original, motivo: "", yaEstaba: true });
        continue;
      }

      if (!/^https?:\/\//i.test(original)) {
        // Un data: o un blob: no se puede traer desde acá: no existe fuera del
        // navegador que lo creó.
        resultados.push({
          original, url: original, yaEstaba: false,
          motivo: "No es una dirección web: subila desde la Biblioteca.",
        });
        continue;
      }

      try {
        // 20 segundos. Sin límite, un sitio que no responde cuelga el guardado
        // entero del artículo.
        const corte = AbortSignal.timeout(20_000);
        const r = await fetch(original, {
          signal: corte,
          headers: {
            // Algunos sitios devuelven 403 a un pedido sin navegador declarado.
            "User-Agent": "Mozilla/5.0 (compatible; CORE-Market/1.0)",
            "Accept": "image/*,video/*;q=0.9,*/*;q=0.8",
          },
        });

        if (!r.ok) {
          resultados.push({
            original, url: original, yaEstaba: false,
            motivo: `El sitio no la entregó (${r.status}).`,
          });
          continue;
        }

        const tipoMime = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        const ext = EXTENSION[tipoMime];
        if (!ext) {
          resultados.push({
            original, url: original, yaEstaba: false,
            motivo: `No es una imagen ni un video (${tipoMime || "sin tipo"}).`,
          });
          continue;
        }

        const bytes = new Uint8Array(await r.arrayBuffer());
        if (bytes.byteLength === 0) {
          resultados.push({
            original, url: original, yaEstaba: false, motivo: "Llegó vacía.",
          });
          continue;
        }
        if (bytes.byteLength > MAXIMO) {
          resultados.push({
            original, url: original, yaEstaba: false,
            motivo: `Pesa ${Math.round(bytes.byteLength / 1048576)} MB: el máximo son 25 MB.`,
          });
          continue;
        }

        const esVideo = tipoMime.startsWith("video/");
        const bucket  = esVideo ? BUCKET_VIDEO : BUCKET_IMAGEN;
        const ruta    = `${user.id}/${crypto.randomUUID()}.${ext}`;

        // Se sube CON la sesión del usuario, no con la llave de servicio: las
        // reglas del bucket son las mismas que cuando sube un archivo a mano, y
        // así no hay un camino privilegiado que se salte lo que rige al otro.
        const { error: eSubir } = await userClient.storage
          .from(bucket).upload(ruta, bytes, { contentType: tipoMime, upsert: false });
        if (eSubir) {
          resultados.push({
            original, url: original, yaEstaba: false,
            motivo: `No se pudo guardar: ${eSubir.message}`,
          });
          continue;
        }

        const { error: eFila } = await userClient.from("media_library").insert({
          user_id: user.id,
          bucket,
          path: ruta,
          tipo: esVideo ? "video" : "imagen",
          nombre: nombreDe(original, ext),
          size_bytes: bytes.byteLength,
          categoria: "articulo",
          // De dónde salió. Sirve para no volver a bajar la misma, y para poder
          // decir de dónde vino cuando alguien pregunte.
          metadata: { origen: original },
          status: "ready",
        });

        if (eFila) {
          // La fila es la que la hace visible en la Biblioteca. Sin ella el
          // archivo existe y nadie lo ve, así que se deshace la subida en vez
          // de dejar basura invisible ocupando lugar.
          await userClient.storage.from(bucket).remove([ruta]);
          resultados.push({
            original, url: original, yaEstaba: false,
            motivo: `No se pudo anotar en la Biblioteca: ${eFila.message}`,
          });
          continue;
        }

        resultados.push({
          original, yaEstaba: false, motivo: "",
          url: userClient.storage.from(bucket).getPublicUrl(ruta).data.publicUrl,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resultados.push({
          original, url: original, yaEstaba: false,
          motivo: msg.includes("aborted") || msg.includes("timed out")
            ? "El sitio tardó demasiado en responder."
            : `No se pudo traer: ${msg}`,
        });
      }
    }

    return json({
      medios: resultados,
      traidas:  resultados.filter(x => !x.motivo && !x.yaEstaba).length,
      yaEstaban: resultados.filter(x => x.yaEstaba).length,
      fallaron: resultados.filter(x => x.motivo).length,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
