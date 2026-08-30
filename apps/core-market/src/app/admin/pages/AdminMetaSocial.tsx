/**
 * Meta — Instagram · Facebook · WhatsApp.
 *
 * DE DÓNDE VIENE
 * Estaba en `packages/core-meta`, sin `package.json` —así que pnpm lo ignoraba—
 * y con un import a `../hooks/useApiVault`, una ruta que no existe. Nunca
 * estuvo montado en ningún lado: 1.900 líneas escritas y jamás ejecutadas.
 *
 * POR QUÉ VIVE ACÁ Y NO EN UN PAQUETE
 * Porque lee las credenciales del API Vault del panel, que es de core-market.
 * Hacerlo paquete repetiría lo de `@core/commerce`: un paquete que importa de
 * vuelta a su consumidor y por lo tanto no sirve para ningún otro.
 *
 * Lo que SÍ es extraíble son los tres servicios —`instagramService`,
 * `facebookService`, `whatsappService`—: reciben credenciales y llaman a la
 * API, sin saber de React ni del Vault. El día que otra app los necesite, ese
 * es el corte limpio.
 *
 * CONECTAR ES AUTENTICARSE, NO CARGAR NUEVE CLAVES
 * El usuario entra con su cuenta de Facebook y la función `meta-oauth` resuelve
 * el resto: alarga el token, busca la página, la cuenta de Instagram vinculada
 * y el número de WhatsApp, y escribe las entradas en el Vault. Es el mismo
 * mecanismo que ya usamos con Mercado Libre.
 *
 * Cargarlas a mano sigue estando: hay quien ya tiene los tokens. Pero como
 * segunda opción, no como la única.
 *
 * LOS HOOKS VIVEN ACÁ, NO EN EL PANEL
 * Porque la barra los necesita: "Probar" tiene que saber si hay credenciales y
 * llamar a `verifyConnection`. Con los hooks adentro del panel, la barra —que
 * va arriba— no tenía forma de enterarse. El panel queda como lo que es:
 * cómo se ve, no qué pasa.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { ItemDeBarra } from "../components/BarraDeAcciones";
import { MetaSocialPanel, Seccion } from "../meta-social/components/MetaSocialPanel";
import { Requisitos } from "../meta-social/components/Requisitos";
import { Cuestionario } from "../meta-social/components/Cuestionario";
import { useMetaVault } from "../meta-social/hooks/useMetaVault";
import { useInstagram } from "../meta-social/hooks/useInstagram";
import { useFacebook } from "../meta-social/hooks/useFacebook";
import { useWhatsApp } from "../meta-social/hooks/useWhatsApp";

const SECCIONES = [
  { valor: "todo",      label: "Todo" },
  { valor: "instagram", label: "Instagram" },
  { valor: "facebook",  label: "Facebook" },
  { valor: "whatsapp",  label: "WhatsApp" },
];

export default function AdminMetaSocial() {
  const navegar = useNavigate();
  const p = usePantalla();
  const { setVista, setTopStats } = useShop();

  const vault = useMetaVault();
  const ig = useInstagram(vault.instagramCredentials);
  const fb = useFacebook(vault.facebookCredentials);
  const wa = useWhatsApp(vault.whatsappCredentials);

  /* Un solo estado para la sección: lo escriben los botones del menú y el
     selector de adentro del buscador, que son el mismo control en dos lugares. */
  const [seccion, setSeccion] = useState("todo");

  /* Si es CORE Market, el instructivo suma los pasos de crear la app en Meta.
     Una tienda no puede hacer eso y no tiene por qué leerlo: mostrarle
     instrucciones que no puede seguir le hace creer que el problema es suyo. */
  const [esPlataforma, setEsPlataforma] = useState(false);
  useEffect(() => {
    supabase.rpc("soy_la_plataforma").then(({ data, error }) => {
      if (!error) setEsPlataforma(data === true);
    });
  }, []);
  const [params, setParams] = useSearchParams();
  const [conectando, setConectando] = useState(false);
  /* Si la app de Meta está cargada. Lo dice el diagnóstico y lo necesita el
     botón de conectar, que vive arriba: sin app, conectar no puede funcionar y
     hay que decirlo ahí, no dejar que falle contra Facebook. */
  const [appLista, setAppLista] = useState(false);

  /*
   * Conectar abre una VENTANA APARTE.
   *
   * Antes se iba de CORE Market: si Facebook fallaba —o el usuario cancelaba—
   * uno quedaba tirado en una pantalla de Facebook, sin nada que lo trajera de
   * vuelta. En una ventana aparte, el panel nunca se pierde de vista.
   *
   * El token de sesión viaja por query y no por header: esto es una
   * NAVEGACIÓN, no un fetch, y una navegación no lleva headers. Es lo mismo
   * que hace Mercado Libre.
   *
   * `origen` es para volver acá y no a producción: probando en localhost, sin
   * esto, la conexión se guarda bien y el que la hizo nunca la ve. El servidor
   * lo valida contra una lista.
   */
  const conectar = async (que: "meta" | "facebook" | "instagram" | "whatsapp" = "meta") => {
    setConectando(true);
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
      setConectando(false);
      p.avisar("La sesión venció. Volvé a entrar y probá de nuevo.", false);
      return;
    }

    const base   = import.meta.env.VITE_SUPABASE_URL;
    const origen = encodeURIComponent(window.location.origin);
    /* `que` decide cuántos permisos se piden: conectar sólo WhatsApp pide tres
       en vez de ocho, y cada permiso de más es una razón más para dudar antes
       de aceptar. */
    const url    = `${base}/functions/v1/meta-oauth?action=connect`
                 + `&token=${token}&origen=${origen}&ventana=1&que=${que}`;

    const v = window.open(url, "meta-oauth", "width=620,height=780");
    if (!v) {
      /* El navegador la bloqueó. No se falla: se va en esta pestaña, que es lo
         que pasaba antes. Pero se dice por qué, porque si no parece que el
         botón no hizo nada. */
      p.avisar("El navegador bloqueó la ventana emergente; seguimos en esta pestaña.", false);
      window.location.href = url.replace("&ventana=1", "");
      return;
    }

    /* Si el usuario cierra la ventana sin terminar, el botón tiene que volver
       a estar disponible. Sin esto queda en "Abriendo Facebook…" para siempre. */
    const vigilar = window.setInterval(() => {
      if (v.closed) { window.clearInterval(vigilar); setConectando(false); }
    }, 800);
  };

  /*
   * Lo que la ventana avisa al cerrarse.
   *
   * Se comprueba el ORIGEN de cada mensaje: `window` recibe mensajes de
   * cualquiera, y actuar sobre uno sin mirar de dónde viene es dejar que otra
   * página escriba en esta pantalla.
   */
  useEffect(() => {
    const alRecibir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin && !e.origin.startsWith("http://localhost")) return;
      const d = e.data;
      if (!d || d.fuente !== "meta-oauth") return;

      setConectando(false);
      if (d.meta_error) p.avisar(String(d.meta_error), false);
      else if (d.meta_connected === "ninguna") {
        p.avisar("Entraste bien, pero no se encontró ninguna página de Facebook en "
               + "esa cuenta. Instagram y WhatsApp cuelgan de una página.", false);
      } else if (d.meta_connected) {
        p.avisar(`Conectado: ${String(d.meta_connected).split(",").join(", ")}.`);
      }
      void vault.reload();
    };
    window.addEventListener("message", alRecibir);
    return () => window.removeEventListener("message", alRecibir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const desconectar = async () => {
    if (!confirm("¿Desconectar Meta? Se borran las credenciales de Instagram, "
               + "Facebook y WhatsApp de este usuario.")) return;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const base = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${base}/functions/v1/meta-oauth?action=disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok) { p.avisar(r.error ?? "No se pudo desconectar.", false); return; }
    await vault.reload();
    p.avisar(`Desconectado. Se borraron ${r.borradas ?? 0} credenciales.`);
  };

  /*
   * Al volver de Facebook.
   *
   * Se dice QUÉ quedó conectado, no "listo": conectar Facebook y que Instagram
   * no aparezca es el caso más común —la cuenta no es Business, o no está
   * vinculada a la página— y un "conectado" a secas manda al usuario a buscar
   * el problema en cualquier otro lado.
   *
   * Y se limpian los parámetros: si quedaran, recargar la página volvería a
   * mostrar el mismo mensaje como si acabara de pasar.
   */
  useEffect(() => {
    const ok  = params.get("meta_connected");
    const mal = params.get("meta_error");
    if (!ok && !mal) return;

    /*
     * Si esto es la ventana emergente, no se muestra nada acá: se le pasa el
     * resultado al panel que la abrió y se cierra.
     *
     * El aviso lo da el panel, que es el que el usuario está mirando. Mostrarlo
     * en una ventana que se cierra en el mismo instante sería escribirlo donde
     * nadie llega a leerlo.
     *
     * `window.location.origin` como destino del mensaje, nunca "*": con "*"
     * cualquier página que hubiera abierto esta ventana leería el resultado.
     */
    if (params.get("ventana") === "1" && window.opener) {
      try {
        window.opener.postMessage(
          { fuente: "meta-oauth", meta_connected: ok, meta_error: mal },
          window.location.origin);
      } catch { /* el panel se cerró: no hay a quién avisarle */ }
      window.close();
      return;
    }

    if (mal) {
      p.avisar(mal, false);
    } else if (ok === "ninguna") {
      p.avisar("Entraste bien, pero no se encontró ninguna página de Facebook en "
             + "esa cuenta. Instagram y WhatsApp cuelgan de una página.", false);
    } else {
      p.avisar(`Conectado: ${(ok ?? "").split(",").join(", ")}.`);
    }

    setParams(new URLSearchParams(), { replace: true });
    void vault.reload();
    // Sólo al volver de Facebook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plataformas = [
    { id: "instagram", label: "Instagram", h: ig },
    { id: "facebook",  label: "Facebook",  h: fb },
    { id: "whatsapp",  label: "WhatsApp",  h: wa },
  ];

  const conectadas = plataformas.filter(x => x.h.status === "connected").length;
  const configuradas = plataformas.filter(x => x.h.isConfigured).length;

  /*
   * Los contadores van a la barra de arriba, que es donde vive lo general.
   *
   * "Configuradas" y "conectadas" NO son lo mismo y por eso van los dos:
   * una credencial cargada en el Vault no prueba que funcione. Con un solo
   * número, una cuenta con el token vencido se ve igual que una sana.
   */
  useEffect(() => {
    setVista("");
    setTopStats([
      { label: "Configuradas", value: `${configuradas}/3`, color: "#fff" },
      { label: "Conectadas",   value: `${conectadas}/3`,
        color: conectadas === configuradas ? "#4ADE80" : "#F5C542" },
    ]);
    return () => { setTopStats([]); setVista(""); };
  }, [configuradas, conectadas, setTopStats, setVista]);

  /* Probar es llamar de verdad: `verifyConnection` pega a la API de Meta con
     la credencial guardada. Si sale bien, funciona — no simula nada. */
  const aProbar = seccion === "todo"
    ? plataformas.filter(x => x.h.isConfigured)
    : plataformas.filter(x => x.id === seccion && x.h.isConfigured);

  const acciones: ItemDeBarra[] = [
    {
      label: aProbar.length > 1 ? `Probar las ${aProbar.length}` : "Probar",
      destacado: true, color: "var(--brand-madre)",
      desactivada: aProbar.length === 0,
      motivo: configuradas === 0
        ? "No hay credenciales de Meta en el API Vault"
        : "Esta plataforma no tiene credenciales cargadas",
      title: "Llama a la API de Meta con la credencial guardada",
      onClick: () => { for (const x of aProbar) x.h.reconnect(); },
    },
    {
      label: conectando ? "Abriendo Facebook…" : configuradas === 0 ? "Conectar" : "Reconectar",
      color: "var(--brand-navy)",
      desactivada: conectando,
      title: "Entrás con tu cuenta de Facebook y los identificadores los resolvemos nosotros",
      onClick: () => { void conectar("meta"); },
    },
    {
      label: "Desconectar",
      color: "#EF4444",
      desactivada: configuradas === 0,
      motivo: "No hay nada conectado",
      onClick: () => { void desconectar(); },
    },
    {
      label: "Credenciales",
      title: "Abrir el API Vault, por si preferís cargarlas a mano",
      onClick: () => navegar("/admin/api-vault"),
    },
    {
      /* El asistente vive en el Vault, que es donde se guardan. Traerlo acá
         sería un segundo lugar donde mantener lo mismo. */
      label: "Cómo la consigo",
      title: "Te llevo paso a paso hasta la credencial",
      onClick: () => navegar("/admin/api-vault"),
    },
  ];

  return (
    <Pantalla p={p}
      secciones={{
        valor: seccion,
        opciones: SECCIONES,
        onCambio: setSeccion,
      }}
      extra={acciones}
      explicacion="Instagram, Facebook y WhatsApp con las credenciales del API Vault."

      /* Sin credenciales la pantalla se ve vacía y parece rota; decir dónde se
         cargan es la diferencia entre un error y una instrucción. Y una que
         falló no es lo mismo que una que nunca se configuró: son dos avisos. */
      notificaciones={[
        ...(!vault.loading && configuradas === 0 ? [{
          tono: "atencion" as const,
          texto: "No hay credenciales de Meta en el API Vault. Se cargan en API Vault → Claves, y recién ahí esta pantalla puede conectarse.",
        }] : []),
        ...plataformas
          .filter(x => x.h.isConfigured && x.h.error)
          .map(x => ({ tono: "error" as const, texto: x.label + ": " + x.h.error })),
      ]}>

      <MetaSocialPanel
        seccion={seccion as Seccion}
        cargandoVault={vault.loading}
        ig={ig} fb={fb} wa={wa} />

      {/* El instructivo, debajo de las tarjetas. La URL que hay que registrar
          en Meta sale del entorno y se copia de un click: escribirla a mano es
          la forma más fácil de que no coincida, y Meta compara el texto
          exacto. */}
      {/* Antes de conectar: las preguntas, una por vez. Desaparece cuando ya
          hay algo conectado — a partir de ahí, lo que dijo alguien vale menos
          que lo que contestó Meta, y eso lo dice `Requisitos`. */}
      {configuradas === 0 && (
        <Cuestionario
          esPlataforma={esPlataforma}
          appLista={appLista}
          conectando={conectando}
          onConectar={que => { void conectar(que); }} />
      )}

      {/* Qué hace falta, comprobado contra Meta. Los botones de conectar NO
          están acá: están arriba, donde se termina de decidir. */}
      <Requisitos
        esPlataforma={esPlataforma}
        onEstado={setAppLista}
        avisar={p.avisar} />

    </Pantalla>
  );
}
