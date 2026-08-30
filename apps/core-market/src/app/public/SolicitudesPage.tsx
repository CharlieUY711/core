/**
 * Política ante solicitudes de autoridades. Pública, sin sesión.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Meta pregunta, en la revisión de datos, qué procesos hay para responder a
 * pedidos de autoridades públicas. Las cuatro opciones que ofrece son las
 * cuatro secciones de acá.
 *
 * ANTES DE ESTO NO HABÍA NINGUNA, y la única respuesta verdadera era "ninguna
 * de las anteriores". Este texto no se escribió para poder marcar casilleros:
 * se escribió para que marcarlos sea cierto. Son cuatro compromisos que una
 * empresa chica puede sostener de verdad — por eso ninguno promete un equipo
 * legal permanente ni plazos que no se puedan cumplir.
 *
 * Si algo de acá no se va a cumplir, hay que sacarlo del texto ANTES de
 * declararlo ante Meta. Una política que no se sigue es peor que no tenerla:
 * la primera vez que se incumple, quedó por escrito que se sabía.
 *
 * NO ES UNA REVISIÓN LEGAL. Describe un procedimiento razonable; que alcance
 * para la ley uruguaya es una pregunta para un abogado.
 */

const ACTUALIZADA = "30 de agosto de 2026";

export default function SolicitudesPage() {
  return (
    <div style={{
      maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem 5rem",
      fontFamily: "DM Sans, system-ui, sans-serif",
      color: "#1F2937", lineHeight: 1.7, fontSize: "1rem",
    }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "0.78rem", letterSpacing: ".1em",
          textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
          CORE Market
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.3rem 0 0.4rem",
          color: "#0D2B55", lineHeight: 1.15 }}>
          Solicitudes de autoridades públicas
        </h1>
        <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>
          Última actualización: {ACTUALIZADA}
        </div>
      </header>

      <P>
        A veces una autoridad —un juez, un fiscal, un organismo del Estado— pide
        datos de una persona que usa la plataforma. Este documento explica qué
        hacemos cuando eso pasa.
      </P>
      <P>
        <B>El principio es uno solo:</B> los datos de las personas no salen de
        acá salvo que haya una obligación legal que nos alcance, y cuando sale
        algo, sale lo mínimo.
      </P>

      <H>1. Revisamos que la solicitud sea legal</H>
      <P>
        Ninguna solicitud se responde por el solo hecho de venir de una
        autoridad. Antes de entregar cualquier dato verificamos:
      </P>
      <UL items={[
        "Que venga por escrito y de un organismo identificable, con la firma o el expediente que corresponda.",
        "Que la autoridad tenga competencia sobre nosotros o sobre los datos que pide.",
        "Que invoque una norma concreta que la habilite, y no una facultad genérica.",
        "Que el dato pedido exista y esté dentro de lo que esa norma permite pedir.",
      ]} />
      <P>
        Si algo de esto no está claro, pedimos que se aclare antes de responder.
      </P>

      <H>2. Podemos oponernos si la solicitud es ilícita</H>
      <P>
        Si de la revisión surge que la solicitud excede lo que la ley permite, o
        que fue emitida sin competencia, o que pide más de lo que la norma
        habilita, <B>no la cumplimos sin más</B>: la observamos por escrito, y
        si corresponde la recurrimos por la vía que el ordenamiento prevea, con
        asesoramiento legal.
      </P>
      <P>
        Cumplir una orden ilegítima no nos exime de responsabilidad frente a la
        persona cuyos datos entregamos.
      </P>

      <H>3. Entregamos lo mínimo</H>
      <P>
        Cuando la solicitud es legítima, entregamos <B>únicamente los datos
        pedidos</B>, del período pedido y de las personas pedidas. Nunca una
        base completa, nunca «todo lo que tengan de esta persona».
      </P>
      <P>
        Si el pedido está redactado de forma amplia, pedimos que se acote antes
        de responder. Si aun así hay que entregar, separamos lo pertinente y
        dejamos afuera lo que no lo es.
      </P>

      <H>4. Dejamos registro</H>
      <P>
        De cada solicitud guardamos: quién la hizo, cuándo, qué pidió, qué norma
        invocó, qué respondimos, qué datos entregamos y con qué razonamiento
        decidimos entregarlos u oponernos.
      </P>
      <P>
        El registro se conserva por el plazo que exija la ley y permite
        reconstruir cualquier caso después.
      </P>

      <H>Le avisamos a la persona</H>
      <P>
        Cuando la ley lo permite, avisamos a la persona afectada que recibimos
        una solicitud sobre sus datos, para que pueda ejercer sus derechos. No
        lo hacemos si una norma o una orden judicial nos prohíbe expresamente
        avisarle.
      </P>

      <H>Qué no hacemos</H>
      <UL items={[
        "No entregamos datos por pedidos informales, telefónicos o por correo sin respaldo documental.",
        "No damos acceso directo, permanente ni automatizado a nuestros sistemas.",
        "No entregamos datos de personas ajenas a la solicitud.",
      ]} />

      <H>A dónde se dirigen</H>
      <P>
        Toda solicitud debe enviarse por escrito a{" "}
        <A href="mailto:admin@core.com.uy">admin@core.com.uy</A>. Los pedidos
        recibidos por otras vías se derivan a esa dirección antes de ser
        atendidos.
      </P>

      <footer style={{ marginTop: "3rem", paddingTop: "1.5rem",
        borderTop: "1px solid #E5E7EB", fontSize: "0.88rem", color: "#6B7280" }}>
        CORE Market · Uruguay ·{" "}
        <A href="mailto:admin@core.com.uy">admin@core.com.uy</A> ·{" "}
        <A href="/privacidad">Política de privacidad</A>
      </footer>
    </div>
  );
}

/* ── Piezas ────────────────────────────────────────────────────────────── */

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0D2B55",
      margin: "2.2rem 0 0.6rem", lineHeight: 1.25 }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 0.9rem" }}>{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "#111827" }}>{children}</strong>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} style={{ color: "#1A4F9C", fontWeight: 600 }}>{children}</a>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 0.9rem", paddingLeft: "1.3rem" }}>
      {items.map((t, i) => (
        <li key={i} style={{ marginBottom: "0.35rem" }}>{t}</li>
      ))}
    </ul>
  );
}
