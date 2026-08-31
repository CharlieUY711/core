/**
 * Cómo pedir que borremos tus datos. Pública, sin sesión.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ES UNA PÁGINA APARTE Y NO UNA SECCIÓN DE LA POLÍTICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Meta pide una URL propia para esto —"URL de instrucciones para la eliminación
 * de datos"— y la abre sola, sin sesión. Mandarla a la política entera obliga a
 * buscar el párrafo entre veinte; acá lo primero que se lee es qué hacer.
 *
 * ES DE INSTRUCCIONES, NO UN ENDPOINT
 * Meta tiene dos campos distintos: uno recibe una petición firmada por máquina
 * y otro es una página para personas. Éste es el segundo, así que lo que tiene
 * que haber acá es un procedimiento que alguien pueda seguir, no una API.
 *
 * DICE TAMBIÉN QUÉ NO SE BORRA
 * Los pedidos y comprobantes hay que conservarlos por obligación fiscal. Callar
 * eso haría que alguien pida el borrado creyendo que desaparece todo, y
 * descubra después que no. Prometer de más es peor que decir que no.
 */

const ACTUALIZADA = "30 de agosto de 2026";
const CORREO = "admin@core.com.uy";

export default function EliminacionDeDatosPage() {
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
          Cómo pedir que borremos tus datos
        </h1>
        <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>
          Última actualización: {ACTUALIZADA}
        </div>
      </header>

      <P>
        Podés pedirnos que borremos tus datos personales cuando quieras. Acá está
        cómo, qué borramos y qué estamos obligados a conservar.
      </P>

      <H>Escribinos</H>
      <P>
        Mandá un correo a <A href={`mailto:${CORREO}?subject=Borrar%20mis%20datos`}>
        {CORREO}</A> <B>desde la dirección con la que entrás a CORE Market</B>,
        con el asunto <B>«Borrar mis datos»</B>.
      </P>
      <P>
        Que venga de tu propia dirección es lo que nos permite saber que sos vos.
        Si escribís desde otra, te vamos a pedir que lo confirmes desde la tuya
        antes de borrar nada: es la única forma de que nadie pueda pedir el
        borrado de la cuenta de otra persona.
      </P>

      <H>Qué pasa después</H>
      <UL items={[
        "Te confirmamos que recibimos el pedido.",
        "Borramos lo que corresponde y te decimos exactamente qué se borró.",
        "Si algo no se puede borrar, te decimos qué es y por qué.",
        "Respondemos dentro de los plazos que fija la Ley 18.331 de Protección de Datos Personales.",
      ]} />

      <H>Qué borramos</H>
      <UL items={[
        "Tu perfil: nombre, documento, preferencias y notas.",
        "Tus direcciones y sus coordenadas.",
        "Tus teléfonos y demás formas de contacto.",
        "Las credenciales de servicios que hayas conectado, incluidas las de Facebook, Instagram y WhatsApp.",
        "Tu cuenta de acceso.",
      ]} />

      <H>Qué no podemos borrar, y por qué</H>
      <P>
        Los <B>pedidos y sus comprobantes</B> hay que conservarlos: son
        documentación contable y fiscal, y la ley obliga a guardarlos por un
        plazo determinado, aunque la persona pida el borrado.
      </P>
      <P>
        Lo decimos acá y no cuando ya pediste el borrado: enterarte después de
        que algo quedó sería peor que saberlo ahora. Esos registros se conservan
        sólo para cumplir esa obligación y no se usan para ninguna otra cosa.
      </P>

      <H>Si conectaste Facebook, Instagram o WhatsApp</H>
      <P>
        Además de escribirnos, podés <B>desconectarlas vos mismo en cualquier
        momento</B> desde el panel de CORE Market, en la pantalla de Meta: ahí
        borramos las credenciales en el momento, sin esperar a nadie.
      </P>
      <P>
        También podés quitarle el permiso a CORE Market desde tu propia cuenta de
        Facebook, en <B>Configuración → Apps y sitios web</B>. Eso corta el
        acceso del lado de Meta; para borrar lo que ya está guardado en CORE
        Market, escribinos.
      </P>
      <P>
        <B>Nunca leímos tus mensajes privados</B> ni guardamos tu información
        personal de Facebook: sólo los identificadores de tu página, tu cuenta de
        Instagram y tu número de WhatsApp, y los permisos que nos diste para
        publicar en tu nombre.
      </P>

      <footer style={{ marginTop: "3rem", paddingTop: "1.5rem",
        borderTop: "1px solid #E5E7EB", fontSize: "0.88rem", color: "#6B7280" }}>
        CORE Market · Uruguay · <A href={`mailto:${CORREO}`}>{CORREO}</A> ·{" "}
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
