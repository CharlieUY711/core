/**
 * Las preguntas, una por vez, para alguien que nunca hizo esto.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARA QUIÉN ESTÁ ESCRITO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Para una señora de 83 años que quiere vender y no sabe qué es una "cuenta
 * Business vinculada a una página". Eso no es una nota al pie: cambia todo.
 *
 *   UNA PREGUNTA POR VEZ. Cinco condiciones juntas en una lista son cinco
 *   cosas que hay que entender antes de poder hacer la primera.
 *
 *   "NO" NO ES UN ERROR. Es la respuesta más útil de las dos: dice exactamente
 *   qué hay que resolver. Por eso el "No" abre la ayuda ahí mismo, con el
 *   enlace, en vez de pintar algo de rojo.
 *
 *   NO SE PREGUNTA LO QUE NO HACE FALTA. Si dice que no va a usar Instagram,
 *   las tres preguntas de Instagram no aparecen. Instagram y WhatsApp son
 *   opcionales de verdad, no "recomendados".
 *
 *   SE RECUERDA. Las respuestas quedan guardadas en el navegador: nadie
 *   contesta cinco preguntas dos veces porque se le cerró la pestaña.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTO ES LO QUE ELLA DICE, NO LO QUE NOSOTROS COMPROBAMOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sirve para llegar a conectar sabiendo qué falta. La verdad la dice
 * `Requisitos`, que lo comprueba contra Meta después de conectar — y por eso
 * este cuestionario desaparece cuando ya hay algo conectado: a partir de ahí,
 * lo que dijo alguien vale menos que lo que contestó Meta.
 */
import { useState, useEffect } from "react";
import { BarraDeAccionesSuelta } from "../../components/BarraDeAcciones";

type Respuesta = "si" | "no" | "nolouso" | null;

interface Pregunta {
  id: string;
  texto: string;
  /** Sólo se pregunta si esto da true. */
  cuando?: (r: Record<string, Respuesta>) => boolean;
  /** Se puede contestar "No lo voy a usar". */
  opcional?: boolean;
  /** Qué hacer si dice que no. */
  siNo: { titulo: string; pasos: string[]; enlace?: { label: string; url: string } };
}

const usaIG = (r: Record<string, Respuesta>) => r.ig === "si";

const PREGUNTAS: Pregunta[] = [
  {
    id: "fb",
    texto: "¿Ya tiene una cuenta de Facebook?",
    siNo: {
      titulo: "Hay que crear una. Es gratis y lleva unos minutos.",
      pasos: [
        "Entrá a facebook.com y elegí «Crear cuenta nueva».",
        "Poné tu nombre, tu correo o tu teléfono, y una contraseña.",
        "Facebook te manda un código para confirmar que sos vos.",
        "Cuando termines, volvé acá y marcá que sí.",
      ],
      enlace: { label: "Abrir Facebook", url: "https://www.facebook.com/" },
    },
  },
  {
    id: "pagina",
    texto: "¿Ya administra una página de Facebook?",
    siNo: {
      titulo: "Una página no es lo mismo que su perfil. Es la de su negocio.",
      pasos: [
        "Su perfil es usted; la página es su comercio, y es la que vende.",
        "Entrá al enlace de abajo y poné el nombre del negocio y a qué se dedica.",
        "Con eso ya está: no hace falta completar nada más ahora.",
        "Es importante, porque Instagram y WhatsApp se cuelgan de la página.",
      ],
      enlace: { label: "Crear la página", url: "https://www.facebook.com/pages/create/" },
    },
  },
  {
    id: "ig",
    texto: "¿Ya tiene una cuenta de Instagram?",
    opcional: true,
    siNo: {
      titulo: "Se puede crear, o seguir sin Instagram.",
      pasos: [
        "Si no piensa usar Instagram, elegí «No lo voy a usar» y seguimos.",
        "Si quiere tenerla, se crea desde la aplicación o desde instagram.com.",
      ],
      enlace: { label: "Abrir Instagram", url: "https://www.instagram.com/" },
    },
  },
  {
    id: "igPro",
    texto: "¿Su cuenta de Instagram ya es profesional (Empresa o Creador)?",
    cuando: usaIG,
    siNo: {
      titulo: "Se cambia desde la aplicación de Instagram, en el teléfono.",
      pasos: [
        "Abrí Instagram y entrá a su perfil.",
        "Tocá las tres rayitas arriba a la derecha y después «Configuración».",
        "Buscá «Tipo de cuenta y herramientas» y tocá «Cambiar a cuenta profesional».",
        "Elegí «Empresa». Es gratis y se puede volver atrás cuando quiera.",
      ],
      enlace: { label: "Abrir Instagram", url: "https://www.instagram.com/" },
    },
  },
  {
    id: "igVinculada",
    texto: "¿Su cuenta de Instagram ya está vinculada con la página de Facebook?",
    cuando: usaIG,
    siNo: {
      titulo: "Se vinculan desde Instagram, en el mismo lugar.",
      pasos: [
        "En Instagram: Configuración → «Cuenta» → «Compartir en otras aplicaciones».",
        "Elegí Facebook y después la página de su negocio.",
        "Si le pide entrar a Facebook, entrá con la cuenta que administra la página.",
        "Sin este paso, Instagram no aparece por más que todo lo demás esté bien.",
      ],
    },
  },
  {
    id: "wa",
    texto: "¿Quiere administrar también WhatsApp?",
    opcional: true,
    siNo: {
      titulo: "Tiene que ser WhatsApp Business, no el WhatsApp común.",
      pasos: [
        "Si no lo va a usar, elegí «No lo voy a usar» y seguimos: las otras dos andan igual.",
        "WhatsApp Business es una aplicación aparte, gratis, que se baja del teléfono.",
        "Además hay que asociarla a su negocio en Meta Business, en el enlace de abajo.",
        "Si se traba en esta parte, avisá: es la más enredada de todas.",
      ],
      enlace: { label: "Abrir Meta Business", url: "https://business.facebook.com/settings" },
    },
  },
];

const LLAVE = "core.meta.cuestionario";

export function Cuestionario({ esPlataforma, appLista, onConectar, conectando }: {
  esPlataforma: boolean;
  /** Si CORE Market ya cargó la app. Sin eso, conectar no puede funcionar. */
  appLista: boolean;
  onConectar: (que: "meta" | "facebook" | "instagram" | "whatsapp") => void;
  conectando: boolean;
}) {
  const [r, setR] = useState<Record<string, Respuesta>>({});

  /* Se recuerda: nadie contesta seis preguntas de nuevo porque se le cerró la
     pestaña. Y si el navegador no deja guardar, no se rompe nada — se vuelve a
     preguntar, que es molesto pero funciona. */
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LLAVE);
      if (guardado) setR(JSON.parse(guardado));
    } catch { /* sin memoria: se pregunta de nuevo */ }
  }, []);

  const responder = (id: string, valor: Respuesta) => {
    const nuevo = { ...r, [id]: valor };
    setR(nuevo);
    try { localStorage.setItem(LLAVE, JSON.stringify(nuevo)); } catch { /* da igual */ }
  };

  const aplican = PREGUNTAS.filter(p => !p.cuando || p.cuando(r));
  /* La primera sin contestar. Las de más abajo ni se muestran: de a una. */
  const actual = aplican.find(p => !r[p.id]);
  const listas = aplican.filter(p => r[p.id]);

  /* Está en condiciones cuando ninguna de las que aplican quedó en "no". Un
     "No lo voy a usar" NO es un problema: es una decisión. */
  const pendientes = aplican.filter(p => r[p.id] === "no");
  const termino = !actual && pendientes.length === 0;

  /* Qué conectar según lo que dijo. Ofrecerle WhatsApp a quien dijo que no lo
     va a usar sería no haberla escuchado. */
  const conIG = r.ig === "si" && r.igPro === "si" && r.igVinculada === "si";
  const conWA = r.wa === "si";

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12,
      background: "#fff", padding: "1.1rem 1.2rem",
      display: "flex", flexDirection: "column", gap: "1rem" }}>

      <div>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111" }}>
          Empecemos por lo que ya tiene
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--mute)" }}>
          Seis preguntas cortas. Si algo falta, le decimos cómo resolverlo.
        </div>
      </div>

      {/* Las contestadas, en una línea cada una. Se pueden cambiar. */}
      {listas.map(p => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9,
          fontSize: "0.82rem", color: "#374151" }}>
          <span aria-hidden="true" style={{ flex: "0 0 auto", width: 20, height: 20,
            borderRadius: "50%", fontSize: "0.72rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: r[p.id] === "si" ? "#DCFCE7"
                      : r[p.id] === "no" ? "#FBEEDA" : "var(--gray-50)",
            color: r[p.id] === "si" ? "#166534"
                 : r[p.id] === "no" ? "#9A5A08" : "var(--mute)" }}>
            {r[p.id] === "si" ? "✓" : r[p.id] === "no" ? "!" : "–"}
          </span>
          <span style={{ flex: 1 }}>{p.texto}</span>
          <button onClick={() => responder(p.id, null)}
            style={{ border: "none", background: "transparent", cursor: "pointer",
              color: "var(--mute)", fontSize: "0.74rem", textDecoration: "underline" }}>
            cambiar
          </button>
        </div>
      ))}

      {/* La que toca ahora. Botones grandes: se contesta con el dedo. */}
      {actual && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.9rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111",
            lineHeight: 1.4, marginBottom: "0.7rem" }}>
            {actual.texto}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Grande onClick={() => responder(actual.id, "si")} destacado>Sí</Grande>
            <Grande onClick={() => responder(actual.id, "no")}>No</Grande>
            {actual.opcional && (
              <Grande onClick={() => responder(actual.id, "nolouso")}>
                No lo voy a usar
              </Grande>
            )}
          </div>
        </div>
      )}

      {/* Lo que falta resolver. Con los pasos ahí mismo: mandarla a leer a otro
          lado es perderla. */}
      {pendientes.map(p => (
        <div key={p.id} style={{ borderTop: "1px solid var(--border)",
          paddingTop: "0.9rem" }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#111" }}>
            {p.siNo.titulo}
          </div>
          <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem",
            fontSize: "0.86rem", color: "#374151", lineHeight: 1.7 }}>
            {p.siNo.pasos.map((paso, i) => <li key={i}>{paso}</li>)}
          </ol>
          <div style={{ display: "flex", gap: 10, marginTop: "0.7rem", flexWrap: "wrap" }}>
            {p.siNo.enlace && (
              <a href={p.siNo.enlace.url} target="_blank" rel="noopener noreferrer"
                style={{ background: "var(--brand-navy)", color: "#fff",
                  borderRadius: 8, padding: "0.5rem 1rem", fontSize: "0.85rem",
                  fontWeight: 700, textDecoration: "none" }}>
                {p.siNo.enlace.label} ↗
              </a>
            )}
            <Grande onClick={() => responder(p.id, "si")}>Ya lo hice</Grande>
          </div>
        </div>
      ))}

      {/* LOS BOTONES ESTÁN SIEMPRE, no sólo al terminar.
          Un botón que no está no se puede apagar ni explicar: simplemente no
          está, y la pantalla parece rota. Apagado, con el motivo, se entiende
          qué falta para prenderlo. */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.9rem" }}>
        {termino ? (<>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#166534" }}>
            Está todo en orden.
          </div>
          <div style={{ fontSize: "0.84rem", color: "#374151", lineHeight: 1.55,
            marginTop: 3 }}>
            Al apretar se abre una ventana de Facebook. Entrá con tu cuenta y
            aceptá los permisos: <b>los identificadores los buscamos nosotros</b>.
          </div>
        </>) : (
          <div style={{ fontSize: "0.84rem", color: "var(--mute)", lineHeight: 1.55 }}>
            {actual
              ? "Contestá las preguntas de arriba y se habilita."
              : "Resolvé lo que falta y marcá «Ya lo hice»."}
          </div>
        )}

        <div style={{ marginTop: "0.8rem" }}>
          {/* Cada botón pide sólo SUS permisos, y sólo se ofrece lo que dijo que
              usa: proponerle WhatsApp a quien contestó que no lo va a usar sería
              no haberla escuchado. */}
          <BarraDeAccionesSuelta acciones={[
            { label: "Conectar", destacado: true, color: "var(--brand-madre)",
              desactivada: conectando || !appLista || !termino,
              motivo: !appLista ? "Falta cargar los datos de la app de Meta, acá abajo"
                                : "Terminá las preguntas de arriba",
              onClick: () => onConectar(conIG && conWA ? "meta" : conIG ? "instagram" : conWA ? "whatsapp" : "facebook") },
            ...(conIG ? [{
              label: "Sólo Facebook",
              desactivada: conectando || !appLista || !termino,
              motivo: !appLista ? "Falta cargar los datos de la app de Meta, acá abajo"
                                : "Terminá las preguntas de arriba",
              title: "Conectar la página y dejar Instagram para después",
              onClick: () => onConectar("facebook"),
            }] : []),
          ]} />
        </div>

        {esPlataforma && !appLista && (
          /* La plataforma es la única que carga la app, y es una vez para todas
             las tiendas. Se dice acá porque acá se frenó. */
          <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "#9A5A08" }}>
            Antes de conectar, CORE Market tiene que cargar los datos de la app de
            Meta. Está acá abajo, y es una vez sola.
          </div>
        )}
      </div>
    </div>
  );
}

/** Un botón para contestar. Grande, porque se contesta con el dedo. */
function Grande({ children, onClick, destacado }: {
  children: React.ReactNode; onClick: () => void; destacado?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      minWidth: 96, padding: "0.6rem 1.2rem", borderRadius: 10,
      fontSize: "0.92rem", fontWeight: 700, cursor: "pointer",
      fontFamily: "inherit",
      border: destacado ? "none" : "1.5px solid var(--border)",
      background: destacado ? "var(--brand-madre)" : "#fff",
      color: destacado ? "#fff" : "#374151",
    }}>
      {children}
    </button>
  );
}

export default Cuestionario;
