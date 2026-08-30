/**
 * Política de privacidad. Pública, sin sesión.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ ES Y QUÉ NO ES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es un texto ESCRITO SOBRE LO QUE EL CÓDIGO HACE, no una plantilla. Cada dato
 * que se nombra acá se guarda de verdad, y cada tercero que aparece es uno al
 * que efectivamente le llega algo: se leyó el esquema del perfil, la tabla de
 * pedidos, las funciones de conexión y el Vault antes de escribir una línea.
 *
 * NO es una revisión legal. Dice lo que el sistema hace; que eso alcance para
 * cumplir con la ley uruguaya (Ley 18.331) o con el RGPD es una pregunta para
 * un abogado, y hay que hacérsela antes de tratarla como definitiva.
 *
 * TIENE QUE SER ALCANZABLE SIN SESIÓN
 * Meta la exige pública: la abren sus rastreadores, no una persona con cuenta.
 * Por eso vive en `/privacidad`, fuera de `/admin`, y por eso hizo falta que el
 * `vercel.json` de la raíz devuelva `index.html` para cualquier ruta — sin eso,
 * entrar directo a `/privacidad` daba 404 y Meta la rechazaba sin decir por qué.
 */

const ACTUALIZADA = "30 de agosto de 2026";

export default function PrivacidadPage() {
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
          Política de privacidad
        </h1>
        <div style={{ color: "#6B7280", fontSize: "0.9rem" }}>
          Última actualización: {ACTUALIZADA}
        </div>
      </header>

      <P>
        CORE Market es una plataforma de comercio: las tiendas publican sus
        artículos y las personas compran. Esta política explica qué datos
        guardamos, para qué, con quién los compartimos y cómo se piden o se
        borran.
      </P>
      <P>
        Está escrita sobre lo que el sistema hace hoy. Si algo cambia, cambia
        también acá, con la fecha de arriba.
      </P>

      <H>Quién es responsable</H>
      <P>
        CORE Market administra la plataforma. Cada tienda es responsable de los
        datos de sus propios compradores: nosotros los guardamos por cuenta de
        ella y no los usamos para otra cosa. Para cualquier consulta:{" "}
        <A href="mailto:admin@core.com.uy">admin@core.com.uy</A>.
      </P>

      <H>Qué datos guardamos</H>

      <SubH>De quien usa la plataforma</SubH>
      <UL items={[
        "Correo electrónico y nombre, para identificarte y poder entrar.",
        "Documento de identidad, si lo cargás en tu perfil.",
        "Direcciones: calle, número, apartamento, esquina, indicaciones, ciudad y código postal, con sus coordenadas si usás el mapa.",
        "Teléfonos, WhatsApp y otros contactos que agregues.",
        "Preferencias de contacto y horario, y las notas que escribas.",
      ]} />

      <SubH>De las compras</SubH>
      <UL items={[
        "Los pedidos: qué se compró, cuánto, en qué moneda y cuándo.",
        "El estado del pago y el identificador que devuelve la pasarela — Mercado Pago o PayPal—. No guardamos números de tarjeta: no pasan por nuestros servidores.",
        "Un identificador de carrito guardado en una cookie, para que lo que agregaste no se pierda al cambiar de página.",
      ]} />

      <SubH>De las tiendas</SubH>
      <UL items={[
        "Los datos del comercio y de quien lo administra.",
        "Las credenciales de los servicios que la tienda conecta, guardadas cifradas y accesibles sólo por quien las cargó.",
      ]} />

      <SubH>Uso de la plataforma</SubH>
      <P>
        Registramos eventos de uso —qué se vio, qué se buscó— para entender qué
        funciona y qué no. No los usamos para perfilar personas ni los vendemos.
      </P>

      <H>Para qué los usamos</H>
      <UL items={[
        "Para que puedas entrar, comprar y seguir tu pedido.",
        "Para que la tienda pueda preparar y entregar lo que compraste.",
        "Para cobrar, a través de las pasarelas de pago.",
        "Para responderte cuando escribís.",
        "Para cumplir obligaciones legales y contables.",
      ]} />
      <P>
        <B>No vendemos datos personales</B>, y no los usamos para publicidad de
        terceros.
      </P>

      <H>Con quién los compartimos</H>
      <P>
        Sólo con quienes hacen falta para que la plataforma funcione, y sólo lo
        que cada uno necesita:
      </P>
      <UL items={[
        "Supabase — la base de datos y el alojamiento del sistema.",
        "Vercel — el alojamiento del sitio.",
        "Mercado Pago y PayPal — para cobrar.",
        "Mercado Libre — si la tienda publica ahí, los datos de la publicación y del pedido.",
        "Meta (Facebook, Instagram y WhatsApp) — si la tienda conecta sus cuentas, para publicar y para avisarle a un comprador.",
        "Mapbox — para ubicar una dirección en el mapa.",
        "La tienda que te vendió — sus compradores son sus clientes.",
      ]} />
      <P>
        Algunos de estos servicios están fuera de Uruguay, así que tus datos
        pueden guardarse en otros países.
      </P>

      <H>Cuando conectás Facebook, Instagram o WhatsApp</H>
      <P>
        Si administrás una tienda y conectás tus cuentas de Meta, guardamos los
        permisos que nos das y los identificadores de tu página, de tu cuenta de
        Instagram y de tu número de WhatsApp. Los usamos únicamente para lo que
        pediste: mostrar tus publicaciones, publicar en tu nombre y enviar avisos
        a tus compradores.
      </P>
      <P>
        <B>No leemos tus mensajes privados ni tu información personal de
        Facebook.</B> Podés desconectar las cuentas en cualquier momento desde el
        panel, y ahí borramos las credenciales. También podés quitarnos el
        permiso desde la configuración de tu cuenta en Meta.
      </P>

      <H>Cuánto tiempo los guardamos</H>
      <UL items={[
        "La cuenta y el perfil, mientras la cuenta exista.",
        "Los pedidos y comprobantes, el tiempo que exigen las obligaciones fiscales y contables.",
        "Las credenciales conectadas, hasta que las desconectes.",
        "La cookie del carrito, un año.",
      ]} />

      <H>Tus derechos</H>
      <P>
        Podés pedir <B>acceder</B> a tus datos, <B>corregirlos</B>,{" "}
        <B>borrarlos</B> u <B>oponerte</B> a que los usemos, escribiendo a{" "}
        <A href="mailto:admin@core.com.uy">admin@core.com.uy</A>. Respondemos
        dentro de los plazos que fija la Ley 18.331 de Protección de Datos
        Personales.
      </P>
      <P>
        Borrar la cuenta no borra los pedidos que ya se hicieron: la ley obliga a
        conservarlos. Sí borramos el perfil, las direcciones, los contactos y las
        credenciales conectadas.
      </P>

      <H>Cómo pedir que borremos tus datos</H>
      <P>
        Escribí a <A href="mailto:admin@core.com.uy">admin@core.com.uy</A> desde
        el correo de tu cuenta, con el asunto <B>«Borrar mis datos»</B>. Te
        confirmamos qué se borró y qué tuvimos que conservar, y por qué.
      </P>

      <H>Seguridad</H>
      <P>
        Los datos viajan cifrados. El acceso está limitado por cuenta: cada
        persona ve lo suyo y cada tienda lo de ella. Las credenciales de
        servicios se guardan aparte, y las más sensibles no salen nunca del
        servidor: ni siquiera quien las cargó puede volver a verlas desde el
        navegador.
      </P>
      <P>
        Ningún sistema es infalible. Si alguna vez ocurre una falla que afecte
        tus datos, te lo vamos a decir.
      </P>

      <H>Menores</H>
      <P>
        La plataforma no está dirigida a menores de 18 años. Si detectamos una
        cuenta de un menor, la damos de baja.
      </P>

      <H>Cambios</H>
      <P>
        Si cambiamos esta política, actualizamos la fecha de arriba. Si el cambio
        es importante, te avisamos.
      </P>

      <footer style={{ marginTop: "3rem", paddingTop: "1.5rem",
        borderTop: "1px solid #E5E7EB", fontSize: "0.88rem", color: "#6B7280" }}>
        CORE Market · Uruguay ·{" "}
        <A href="mailto:admin@core.com.uy">admin@core.com.uy</A>
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

function SubH({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#374151",
      margin: "1.3rem 0 0.4rem" }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 0.9rem" }}>{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "#111827" }}>{children}</strong>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: "#1A4F9C", fontWeight: 600 }}>
      {children}
    </a>
  );
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
