/**
 * Qué hace falta para conectar Meta, comprobado contra Meta.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UN TILDE VERDE QUE SE PONE A MANO NO VALE NADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cada punto de acá se responde llamando a algo: si la app existe en Meta, si
 * la clave secreta es la suya, si hay una página, si esa página tiene Instagram
 * Business vinculado, si hay una cuenta de WhatsApp Business. El verde
 * significa "comprobado", no "leído".
 *
 * TRES ESTADOS, NO DOS
 * Falta uno: DESCONOCIDO. Los requisitos de la cuenta no se pueden mirar sin
 * permiso del dueño —Meta no deja, y está bien que no deje—, así que antes de
 * conectar no se sabe. Pintarlos de verde sería mentir, y de rojo sería acusar
 * a alguien que quizá tiene todo bien. Se dicen en gris: "se comprueba al
 * conectar".
 *
 * Y por eso conectar no está bloqueado detrás de la lista: conectar ES la forma
 * de comprobar el resto.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOS CUATRO BOTONES NO HACEN LO MISMO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lo que cambia son los PERMISOS. Facebook Login deja pedir un subconjunto, así
 * que "Conectar WhatsApp" pide tres permisos y "Conectar Meta" pide ocho. Cada
 * permiso de más es una línea más en la pantalla de aceptación y una razón más
 * para dudar antes de darle Aceptar.
 *
 * Si hicieran lo mismo, sobrarían tres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOS DATOS DE LA APP SE CARGAN ACÁ, NO POR TERMINAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Van al API Vault marcados `solo_servidor`: el navegador NO puede leerlos —
 * las políticas de lectura los excluyen— y sólo los usan las Edge Functions.
 * Una clave secreta de app que llega al navegador deja que cualquiera se haga
 * pasar por nuestra app contra Meta.
 *
 * Por eso el formulario escribe y no lee: los campos arrancan vacíos aunque la
 * credencial esté cargada. Que ESTÁ cargada lo dice el check de arriba, que es
 * lo que hace falta saber.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../../utils/supabase/client";
import { BarraDeAccionesSuelta } from "../../components/BarraDeAcciones";

interface Punto {
  id: string;
  de: "plataforma" | "cuenta";
  titulo: string;
  estado: "ok" | "falta" | "desconocido";
  detalle: string;
}

const COLOR = {
  ok:          { fondo: "#DCFCE7", texto: "#166534", marca: "✓" },
  falta:       { fondo: "#FBEEDA", texto: "#9A5A08", marca: "!" },
  desconocido: { fondo: "var(--gray-50)", texto: "var(--mute)", marca: "?" },
};

/** Un valor que hay que pegar en otro lado, con el botón al lado. */
function Copiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--mute)",
        marginBottom: 3 }}>
        {etiqueta}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <code style={{ flex: "1 1 auto", minWidth: 0, overflowX: "auto",
          whiteSpace: "nowrap", background: "#fff",
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "0.4rem 0.6rem", fontSize: "0.74rem", color: "#374151",
          fontFamily: "ui-monospace, Consolas, monospace" }}>
          {valor || "—"}
        </code>
        <button
          onClick={() => {
            /* `clipboard` no existe fuera de https ni en todos los navegadores.
               Si falla, no se rompe nada: el texto está a la vista para copiar
               a mano, que es peor pero funciona. */
            navigator.clipboard?.writeText(valor)
              .then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); })
              .catch(() => {});
          }}
          disabled={!valor}
          style={{ flex: "0 0 auto", border: "1px solid var(--border)",
            background: "#fff", borderRadius: 6,
            cursor: valor ? "pointer" : "not-allowed",
            padding: "0 0.7rem", fontSize: "0.72rem", fontWeight: 700,
            color: copiado ? "#166534" : "var(--mute)" }}>
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function Marca({ estado }: { estado: Punto["estado"] }) {
  const c = COLOR[estado];
  return (
    <span aria-hidden="true" style={{ flex: "0 0 auto",
      width: 20, height: 20, borderRadius: "50%",
      background: c.fondo, color: c.texto,
      fontSize: "0.72rem", fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      {c.marca}
    </span>
  );
}

function Grupo({ titulo, nota, puntos }: {
  titulo: string; nota: string; puntos: Punto[];
}) {
  if (puntos.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div>
        <div style={{ fontSize: "0.74rem", fontWeight: 800, letterSpacing: ".06em",
          textTransform: "uppercase", color: "var(--mute)" }}>
          {titulo}
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--gray-400)" }}>{nota}</div>
      </div>

      {puntos.map(p => (
        <div key={p.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <Marca estado={p.estado} />
          <div>
            <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "#111" }}>
              {p.titulo}
            </div>
            {/* Sin detalle, no se dibuja: una línea vacía debajo de cada punto
                es media pantalla de aire que hay que recorrer igual. */}
            {p.detalle && (
              <div style={{ fontSize: "0.79rem", color: "#374151", lineHeight: 1.5 }}>
                {p.detalle}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Requisitos({ esPlataforma, avisar, onEstado }: {
  esPlataforma: boolean;
  avisar: (texto: string, ok?: boolean) => void;
  /** Si la app de Meta ya está cargada. Lo necesita el botón de conectar. */
  onEstado?: (appLista: boolean) => void;
}) {
  const [puntos, setPuntos] = useState<Punto[] | null>(null);
  /* El identificador de la app que ya está cargada. Sirve para armar el enlace
     a SU configuración: la lista de apps obliga a buscarla. */
  const [appIdCargado, setAppIdCargado] = useState("");
  const [mirando, setMirando] = useState(false);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [conectado, setConectado] = useState(false);
  /* El formulario de la app: cerrado cuando ya está cargada y verificada. Un
     formulario abierto sobre algo que ya está hecho invita a tocarlo. */
  const [cambiandoApp, setCambiandoApp] = useState(false);

  const verificar = useCallback(async () => {
    setMirando(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) { avisar("La sesión venció. Volvé a entrar.", false); return; }

      const base = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${base}/functions/v1/meta-oauth?action=diagnostico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) { avisar(r.error ?? "No se pudo verificar.", false); return; }
      setPuntos(r.puntos ?? []);
      setAppIdCargado(r.appId ?? "");
      setConectado(!!r.conectado);
      onEstado?.((r.puntos ?? []).some(
        (p: Punto) => p.id === "app" && p.estado === "ok"));
    } finally {
      setMirando(false);
    }
  }, [avisar, onEstado]);

  /* Se verifica al entrar: si hubiera que apretar un botón para enterarse de
     que falta algo, nadie lo aprieta hasta que ya falló. */
  useEffect(() => { void verificar(); }, [verificar]);

  /* Se revisa mientras se escribe: enterarte al guardar de que el
     identificador tenía letras es rehacer el camino a Meta. */
  const idMal = appId.trim() && !/^\d+$/.test(appId.trim())
    ? "El identificador de una app de Meta son sólo números."
    : null;

  const guardarApp = async () => {
    setGuardando(true);
    try {
      for (const [nombre, valor] of [
        ["META_APP_ID", appId.trim()],
        ["META_APP_SECRET", appSecret.trim()],
      ]) {
        const { error } = await supabase.rpc("guardar_credencial_de_servidor", {
          p_plataforma: "Meta", p_nombre: nombre, p_valor: valor,
        });
        if (error) { avisar(error.message, false); return; }
      }
      setAppId(""); setAppSecret("");
      avisar("Datos de la app guardados. Verificando contra Meta…");
      /* Se verifica solo: guardar sin comprobar dejaría al usuario sin saber si
         los valores sirven, que es justamente lo que vino a averiguar. */
      await verificar();
    } finally {
      setGuardando(false);
    }
  };

  /*
   * El enlace a la configuración de la app. La URL de Meta es predecible, así
   * que se arma con el identificador y lleva DIRECTO a esa pantalla.
   *
   * Se prefiere el que se está escribiendo sobre el ya cargado: si alguien está
   * corrigiendo un identificador, el enlace tiene que ir al nuevo. Sin ninguno
   * de los dos, la lista de apps, que es lo mejor que se puede hacer.
   */
  const idParaEnlace = (/^\d+$/.test(appId.trim()) ? appId.trim() : appIdCargado).trim();

  /* Sin identificador NO HAY a dónde llevar: la configuración de una app existe
     por app. Antes los dos enlaces caían a la lista de apps, así que decían
     cosas distintas y hacían lo mismo. Ahora el segundo se apaga y dice por
     qué, que es la regla del panel para todo lo demás. */
  const enlaceBasica = idParaEnlace
    ? `https://developers.facebook.com/apps/${idParaEnlace}/settings/basic/`
    : "https://developers.facebook.com/apps/";
  const enlaceLogin = idParaEnlace
    ? `https://developers.facebook.com/apps/${idParaEnlace}/fb-login/settings/`
    : null;
  /* Los permisos y los roles: las dos pantallas donde se resuelve lo que sigue
     después de que la URL esté bien. */
  const enlacePermisos = idParaEnlace
    ? `https://developers.facebook.com/apps/${idParaEnlace}/use_cases/`
    : null;
  const enlaceRoles = idParaEnlace
    ? `https://developers.facebook.com/apps/${idParaEnlace}/roles/roles/`
    : null;

  /*
   * Los dos valores que hay que pegar en Meta.
   *
   * Son CAMPOS DISTINTOS y hasta ahora nombrábamos uno solo. Faltando el
   * dominio, Facebook contesta "El dominio de esta URL no está incluido en los
   * dominios de la app" y no llega a mostrar la pantalla de permisos.
   *
   * Es lo único que nuestros checks no pueden comprobar —lo registrado en Meta
   * no se lee por API—, así que es lo único que queda a ojo. Por eso va escrito
   * y con botón de copiar, en vez de descrito.
   */
  /* Los pide la FUNCIÓN, no se arman acá. Armarlos por separado es tener dos
     versiones de lo mismo, y la que se muestra puede no ser la que se manda:
     exactamente el error que acabamos de tener. */
  const [urlDeVuelta, setUrlDeVuelta] = useState("");
  const [dominioDeLaApp, setDominioDeLaApp] = useState("");

  useEffect(() => {
    const base = import.meta.env.VITE_SUPABASE_URL;
    fetch(`${base}/functions/v1/meta-oauth?action=url`)
      .then(r => r.json())
      .then(r => { setUrlDeVuelta(r.usamos ?? ""); setDominioDeLaApp(r.dominio ?? ""); })
      .catch(() => { /* sin respuesta, los campos quedan vacíos y se ve */ });
  }, []);

  const appVerificada = (puntos ?? []).some(p => p.id === "app" && p.estado === "ok");

  const dePlataforma = (puntos ?? []).filter(p => p.de === "plataforma");
  const deCuenta     = (puntos ?? []).filter(p => p.de === "cuenta");
  const problemas    = (puntos ?? []).filter(p => p.estado === "falta");

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12,
      background: "#fff", padding: "1rem 1.1rem",
      display: "flex", flexDirection: "column", gap: "1.1rem" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#111" }}>
            Qué hace falta
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--mute)" }}>
            {puntos === null ? "Verificando…"
             : problemas.length === 0 ? "Todo lo que se puede comprobar, está."
             : problemas.length === 1 ? "Falta una cosa."
             : `Faltan ${problemas.length} cosas.`}
          </div>
        </div>
        <BarraDeAccionesSuelta acciones={[{
          label: mirando ? "Verificando…" : "Verificar de nuevo",
          desactivada: mirando,
          onClick: () => { void verificar(); },
        }]} />
      </div>

      {esPlataforma && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <Grupo titulo="De CORE Market · una sola vez"
            nota="La app de Meta con la que se conectan todas las tiendas."
            puntos={dePlataforma} />

          {/* Ya está cargada y verificada: se pliega. Cambiarla es posible pero
              es lo raro, y lo raro no ocupa media pantalla. */}
          {appVerificada && !cambiandoApp ? (
            <BarraDeAccionesSuelta acciones={[{
              label: "Cambiar los datos de la app",
              title: "Sólo si cambiaste de app en Meta",
              onClick: () => setCambiandoApp(true),
            }]} />
          ) : (

          /* El formulario ESCRIBE y no lee: los campos arrancan vacíos aunque
             la credencial esté cargada, porque el navegador no puede leerla.
             Que está cargada lo dice el check de arriba. */
          <div style={{ background: "var(--gray-50)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "0.75rem 0.85rem",
            display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Lo justo. Lo que decía además —cómo se guardan, quién los lee—
                es cómo funciona por dentro: no cambia nada de lo que la persona
                tiene que hacer, y ocupaba el doble. */}
            <div style={{ fontSize: "0.78rem", color: "#374151" }}>
              Los dos están en Meta, en <b>Configuración de la app → Básica</b>.
              La clave secreta está tapada: al lado dice <b>Mostrar</b>.
            </div>

            {/* El enlace va a la configuración de ESTA app, no a la lista: si
                tenés tres apps, "andá a developers.facebook.com" es pedirte que
                busques cuál. */}
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700,
                  color: "var(--mute)", marginBottom: 3 }}>
                  IDENTIFICADOR DE LA APP
                </label>
                <input value={appId} onChange={e => setAppId(e.target.value)}
                  placeholder="1987461465296000"
                  style={{ width: "100%", boxSizing: "border-box",
                    border: `1.5px solid ${idMal ? "#EF4444" : "var(--border)"}`,
                    borderRadius: 8, padding: "0.4rem 0.65rem", fontSize: "0.8rem",
                    outline: "none", fontFamily: "ui-monospace, Consolas, monospace" }} />
                {idMal && (
                  <div style={{ marginTop: 3, fontSize: "0.72rem",
                    color: "#B91C1C", fontWeight: 600 }}>{idMal}</div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700,
                  color: "var(--mute)", marginBottom: 3 }}>
                  CLAVE SECRETA
                </label>
                {/* `password`: no se muestra ni queda en el historial de
                    autocompletado del navegador. */}
                <input value={appSecret} type="password" autoComplete="new-password"
                  onChange={e => setAppSecret(e.target.value)}
                  placeholder="En Meta dice «Mostrar» al lado"
                  style={{ width: "100%", boxSizing: "border-box",
                    border: "1.5px solid var(--border)", borderRadius: 8,
                    padding: "0.4rem 0.65rem", fontSize: "0.8rem", outline: "none",
                    fontFamily: "ui-monospace, Consolas, monospace" }} />
              </div>
            </div>

            <BarraDeAccionesSuelta acciones={[
              { label: guardando ? "Guardando…" : "Guardar y verificar",
                destacado: true, color: "var(--brand-madre)",
                desactivada: guardando || !appId.trim() || !appSecret.trim() || !!idMal,
                motivo: idMal ? "El identificador no tiene la forma esperada"
                              : "Completá los dos",
                onClick: () => { void guardarApp(); } },
              ...(appVerificada ? [{
                label: "Cancelar", onClick: () => setCambiandoApp(false),
              }] : []),
            ]} />
          </div>
          )}

          {/* ── Lo que hay que pegar en Meta ────────────────────────────
              Lo único que no podemos comprobar por API, así que lo único que
              queda a ojo. Escrito y con botón de copiar: es la diferencia entre
              que coincida y que no, y Meta compara el texto exacto. */}
          <div style={{ background: "var(--gray-50)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "0.75rem 0.85rem",
            display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <div style={{ fontSize: "0.78rem", color: "#374151" }}>
              En Meta hay que registrar <b>dos cosas distintas</b>. Si falta el
              dominio, Facebook contesta <i>«El dominio de esta URL no está
              incluido en los dominios de la app»</i> y no llega a pedir permisos.
              {" "}Estos son los valores <b>que la función manda de verdad</b>.
              Los botones llevan a la pantalla exacta de tu app: <b>«Configuración»
              en la barra de arriba de Meta es la de tu cuenta</b>, no la de la app.
            </div>

            {/*
              * Cada valor con el botón que lleva a SU pantalla, al lado.
              *
              * Estaban adentro del formulario de arriba, que se pliega cuando la
              * app ya está cargada: justo cuando lo único que falta es ir a Meta,
              * el botón que lleva a Meta desaparecía.
              *
              * Y el enlace va a la pantalla exacta, no a developers.facebook.com:
              * "Configuración" en la barra de arriba de Meta es la de TU CUENTA
              * —termina en las notificaciones por correo—, no la de la app.
              */}
            <div>
              <Copiable etiqueta="1 · Dominios de la app" valor={dominioDeLaApp} />
              <div style={{ marginTop: 6 }}>
                <BarraDeAccionesSuelta acciones={[{
                  label: "Abrir Configuración → Básica ↗",
                  color: "var(--brand-navy)",
                  desactivada: !idParaEnlace,
                  motivo: "Falta el identificador de la app",
                  title: "La pantalla de tu app, no la de tu cuenta",
                  onClick: () => window.open(enlaceBasica, "_blank", "noopener"),
                }]} />
              </div>
            </div>

            <div>
              <Copiable etiqueta="2 · URI de redireccionamiento de OAuth válidos"
                valor={urlDeVuelta} />
              <div style={{ marginTop: 6 }}>
                <BarraDeAccionesSuelta acciones={[{
                  label: "Abrir Inicio de sesión con Facebook → Configuración ↗",
                  color: "var(--brand-navy)",
                  desactivada: !enlaceLogin,
                  motivo: "Falta el identificador de la app",
                  onClick: () => enlaceLogin && window.open(enlaceLogin, "_blank", "noopener"),
                }]} />
              </div>
              <div style={{ marginTop: 4, fontSize: "0.74rem", color: "var(--mute)" }}>
                Hay que <b>guardar</b> abajo de todo. El «Validador de URI» de esa
                misma pantalla compara contra lo guardado: si no guardaste, dice
                que no es válida aunque la tengas escrita arriba.
              </div>
            </div>

            {/* Lo que sigue después de que la URL esté bien. Enterarse de a una
                cosa por vez, cada una con un error distinto de Facebook, es el
                peor camino posible. */}
            <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "0.6rem" }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--mute)",
                marginBottom: 5 }}>
                3 · Y después, en Meta
              </div>
              <div style={{ fontSize: "0.78rem", color: "#374151", lineHeight: 1.55,
                marginBottom: 7 }}>
                <b>Acceso avanzado</b> para <code>public_profile</code>: sin eso el
                login no arranca. Es un click y no necesita revisión. Publicar en
                Instagram y mandar WhatsApp sí la necesitan.
                {" "}Y mientras la app esté <b>en desarrollo</b>, sólo conectan las
                personas con un rol en ella: para probar vos alcanza, para una
                tienda no.
              </div>
              <BarraDeAccionesSuelta acciones={[
                { label: "Permisos y casos de uso ↗", color: "var(--brand-navy)",
                  desactivada: !enlacePermisos,
                  motivo: "Falta el identificador de la app",
                  onClick: () => enlacePermisos && window.open(enlacePermisos, "_blank", "noopener") },
                { label: "Roles de la app ↗",
                  desactivada: !enlaceRoles,
                  motivo: "Falta el identificador de la app",
                  title: "Agregar a alguien como probador mientras la app está en desarrollo",
                  onClick: () => enlaceRoles && window.open(enlaceRoles, "_blank", "noopener") },
              ]} />
            </div>
          </div>
        </div>
      )}

      {/* SÓLO CUANDO YA HAY ALGO CONECTADO.
          Antes de conectar, los tres decían "se comprueba al conectar" —o sea,
          nada— y encima repetían lo que el cuestionario ya preguntó en
          castellano. Media pantalla para no decir nada, dos veces. */}
      {conectado && (
        <Grupo titulo="De tu cuenta"
          nota="Comprobado contra Meta con tu conexión."
          puntos={deCuenta} />
      )}

      {/* Los botones de conectar NO están acá: están arriba, justo después de
          "Está todo en orden", que es donde la persona termina de decidir. Un
          botón a dos bloques de distancia de la decisión obliga a bajar
          buscando qué sigue. */}
    </div>
  );
}

export default Requisitos;
