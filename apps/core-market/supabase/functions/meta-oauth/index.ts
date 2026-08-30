/**
 * meta-oauth — conectar Instagram, Facebook y WhatsApp con un solo login.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ RESUELVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Antes, para usar Meta había que ir a developers.facebook.com, crear una app,
 * pedir un token de larga duración, buscar a mano el id de la página, el de la
 * cuenta de Instagram Business, el de la WABA y el del número, y cargar NUEVE
 * entradas en el Vault con los nombres exactos. Nadie hace eso bien la primera
 * vez, y cuando sale mal no se sabe cuál de las nueve está mal.
 *
 * Acá el usuario aprieta un botón, se autentica en Facebook, y el resto lo
 * resolvemos nosotros: intercambiamos el código, alargamos el token, y le
 * preguntamos a Meta cuáles son sus páginas, su cuenta de Instagram y su
 * número de WhatsApp. Es lo mismo que ya hacemos con Mercado Libre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DOS COSAS QUE NO SE COPIAN DE ml-oauth
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. EL DUEÑO DE LA CREDENCIAL ES QUIEN SE CONECTA.
 *    `ml-oauth` guarda con el `user_id` del PRIMER usuario del sistema
 *    (`.from('profiles').select('id').limit(1)`). Y la política de lectura del
 *    Vault es `auth.uid() = user_id`: o sea, la credencial de Mercado Libre la
 *    ve una sola persona —la que resultó ser primera— y nadie más, ni siquiera
 *    quien la conectó. Acá el id del usuario viaja en el `state`, firmado por
 *    su propio JWT.
 *
 * 2. SE GUARDAN ENTRADAS CON NOMBRE, NO UN JSON.
 *    `ml-oauth` guarda un blob JSON. La pantalla de Meta lee entradas sueltas
 *    por nombre exacto —`INSTAGRAM_ACCESS_TOKEN` y compañía—, así que se
 *    escriben así. Ventaja secundaria: quien prefiera cargarlas a mano puede
 *    seguir haciéndolo, y las dos formas conviven.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ HACE FALTA EN SUPABASE (Secrets)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   ADMIN_PANEL_URL          a dónde volver después (ya existe para ML)
 *
 * LA URL DE VUELTA NO SE CARGA: se deduce de la URL de esta misma función. Era
 * un Secret y contenía el texto de ejemplo —"<tu-proyecto>.supabase.co"—, así
 * que Facebook recibía un dominio inexistente. Un dato que la función ya sabe
 * no debería depender de que alguien lo copie bien.
 *
 * LOS DATOS DE LA APP VIVEN EN EL API VAULT, marcados `solo_servidor`, y se
 * cargan desde el panel. En ningún otro lado: tenerlos además en un Secret era
 * dos fuentes para un mismo dato, que es la forma más confiable de que un día
 * digan cosas distintas —se corrige una, la otra queda vieja, y cuál gana
 * depende del orden en que las lee el código.
 *
 * El navegador NO puede leerlos: las políticas de lectura excluyen
 * `solo_servidor`, y acá se leen con la service role, que corre en el servidor.
 * Una clave secreta de app que llega al navegador deja que cualquiera se haga
 * pasar por nuestra app.
 *
 * En desarrollo se vuelve a localhost, no a producción: el origen viaja en el
 * `state` y se valida contra una lista. Ver `origenPermitido`.
 *
 * El `redirect_uri` tiene que estar registrado idéntico en la app de Meta:
 * Meta compara el texto exacto, y una barra de más devuelve un error que no
 * dice cuál fue el problema.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v21.0'
const TABLE = 'api_vault'

/**
 * Los permisos que se piden. Uno por cosa que la pantalla hace, ni uno más:
 * cada permiso extra es una pantalla de revisión más en Meta y una razón más
 * para que el usuario dude antes de aceptar.
 */
/*
 * Los permisos, por plataforma.
 *
 * Se puede conectar todo junto o de a una, y eso NO es cosmético: Facebook
 * Login deja pedir un subconjunto, así que conectar sólo WhatsApp pide tres
 * permisos en vez de ocho. Cada permiso de más es una línea más en la pantalla
 * de aceptación y una razón más para dudar antes de darle Aceptar.
 *
 * Instagram lleva los de página aunque parezca de más: una cuenta Business
 * cuelga de una página y sin `pages_show_list` no hay forma de encontrarla.
 */
const PERMISOS: Record<string, string[]> = {
  facebook: [
    'pages_show_list',              // ver de qué páginas es
    'pages_read_engagement',        // leer la página y sus posts
    'pages_manage_posts',           // publicar en la página
  ],
  instagram: [
    'pages_show_list',              // la cuenta Business cuelga de una página
    'pages_read_engagement',
    'instagram_basic',              // perfil y media
    'instagram_content_publish',    // publicar
  ],
  whatsapp: [
    'business_management',          // llegar a la WABA
    'whatsapp_business_management', // plantillas y número
    'whatsapp_business_messaging',  // enviar plantillas
  ],
}

/** Todo junto, sin repetidos. */
const permisosDe = (que: string): string =>
  [...new Set(
    que === 'meta' || !PERMISOS[que]
      ? Object.values(PERMISOS).flat()
      : PERMISOS[que],
  )].join(',')

/**
 * A dónde se puede volver.
 *
 * Redirigir a lo que venga por parámetro sería un redirect abierto: cualquiera
 * arma un link a nuestra función que termina en su propio sitio, con la marca y
 * la confianza de la nuestra. Por eso se valida contra una lista.
 *
 * Localhost entra porque sin eso no se puede probar: uno se autentica en
 * Facebook y aterriza en producción, la conexión queda guardada y el que la
 * hizo nunca la ve.
 */
function origenPermitido(origen: string | null, adminUrl: string): string | null {
  if (!origen) return null
  let u: URL
  try { u = new URL(origen) } catch { return null }

  if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.origin
  try {
    if (u.origin === new URL(adminUrl).origin) return u.origin
  } catch { /* ADMIN_PANEL_URL mal formada: no se permite nada */ }
  return null
}

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

/**
 * La URL a la que Facebook nos devuelve. Deducida, no cargada.
 *
 * `https` a la fuerza: `url.origin` devuelve **http**, porque el gateway
 * reenvía por dentro sin TLS. Sin forzarlo, Facebook rechaza la URL igual, por
 * otra razón y sin decir cuál.
 */
function urlDeVuelta(url: URL): string {
  return `https://${url.hostname}/functions/v1/meta-oauth`
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/**
 * Los datos de la app. Del Vault, y de ningún otro lado.
 *
 * Se leen con la service role, que corre en el servidor y pasa por encima de
 * RLS. El navegador no puede: las políticas de lectura excluyen las marcadas
 * `solo_servidor`, y una clave secreta de app que llega al navegador deja que
 * cualquiera se haga pasar por nuestra app contra Meta.
 *
 * Falta uno de los dos = falta. No se completa con la mitad ni se busca en otro
 * lado: media credencial falla contra Meta con un mensaje que no explica nada.
 */
async function datosDeLaApp(supabase: any) {
  const { data } = await supabase.from(TABLE)
    .select('name, value')
    .eq('platform', 'Meta').eq('solo_servidor', true)
    .in('name', ['META_APP_ID', 'META_APP_SECRET'])

  const v = Object.fromEntries(
    (data ?? []).map((r: { name: string; value: string }) => [r.name, r.value]))

  if (!v.META_APP_ID || !v.META_APP_SECRET) {
    /* Sin decir DÓNDE se carga: este mensaje se muestra adentro de la pantalla
       donde se carga, así que "andá a la pantalla de Meta" manda a donde ya
       estás. Dónde va lo pone la pantalla, que es la que sabe. */
    const cuales = !v.META_APP_ID && !v.META_APP_SECRET
      ? 'el identificador y la clave secreta'
      : !v.META_APP_ID ? 'el identificador' : 'la clave secreta'
    throw new Error(`Falta ${cuales} de la app de Meta.`)
  }
  return revisar(v.META_APP_ID, v.META_APP_SECRET)
}

function revisar(appId: string, appSecret: string) {

  /*
   * El identificador de una app de Meta es SÓLO DÍGITOS. Se revisa acá porque
   * si no, la única señal es la pantalla "Identificador de la app no válido"
   * de Facebook —ya fuera del panel, sin decir cuál de los dos Secrets está
   * mal ni cómo volver—. Un error nuestro, con nombre, se arregla en un minuto.
   */
  if (!/^\d+$/.test(appId.trim())) {
    throw new Error(
      `El identificador de la app ("${appId.slice(0, 12)}…") no es válido: ` +
      'el de una app de Meta son sólo números.')
  }
  return { appId: appId.trim(), appSecret: appSecret.trim() }
}

/** Una llamada al Graph. Devuelve el error de Meta tal cual: es el que sirve. */
async function graph(path: string, token: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(`${GRAPH}/${path}?${qs}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Graph API respondió ${res.status} en /${path}`)
  }
  return data
}

/** Igual que `graph`, pero sin tirar: para lo que puede no estar y no importa. */
async function graphOpcional(path: string, token: string, params: Record<string, string> = {}) {
  try { return await graph(path, token, params) } catch { return null }
}

interface Entrada {
  platform: string
  name: string
  value: string
  /** Cuándo vence, si vence. Los ids no vencen. */
  expiraEn?: number | null
}

/**
 * Escribe una entrada, reemplazando la que hubiera con el mismo nombre.
 *
 * Se busca por (user_id, platform, name) y no por id porque el usuario pudo
 * haberla cargado a mano antes: reconectar tiene que PISAR eso, no dejar dos
 * entradas con el mismo nombre y valores distintos. Con dos, `pickValue` se
 * queda con la primera que encuentra y el resultado depende del orden.
 */
async function guardar(
  supabase: any, userId: string, tenantId: string | null, e: Entrada,
) {
  const comun = {
    name: e.name,
    platform: e.platform,
    type: 'oauth',
    value: e.value,
    env: 'production',
    tags: ['meta', 'oauth'],
    status: 'active',
    expires_at: e.expiraEn ? new Date(e.expiraEn).toISOString() : null,
    last_checked_at: new Date().toISOString(),
    last_error: null,
  }

  const { data: existente } = await supabase.from(TABLE)
    .select('id')
    .eq('user_id', userId)
    .eq('platform', e.platform)
    .eq('name', e.name)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase.from(TABLE).update(comun).eq('id', existente.id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from(TABLE)
    .insert({ ...comun, user_id: userId, tenant_id: tenantId, client_exposed: false })
  if (error) throw error
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)

  /*
   * Si vienen `code` o `error`, es Facebook volviendo: no hace falta que la
   * URL diga `action=callback`.
   *
   * Esto libera al `redirect_uri` de llevar query string, que es un problema
   * real: Meta compara el texto EXACTO de la URL registrada y varias
   * configuraciones rechazan o recortan los parámetros. Con esto la URL
   * registrada puede ser la limpia —.../functions/v1/meta-oauth— y no hay nada
   * que pueda no coincidir.
   */
  const action = url.searchParams.get('action')
    ?? ((url.searchParams.has('code') || url.searchParams.has('error'))
          ? 'callback' : null)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const enVentana = url.searchParams.get('ventana') === '1'
  const adminUrl = Deno.env.get('ADMIN_PANEL_URL') ?? 'https://market.core.com.uy/admin'

  /* `base` sale del `state` cuando el callback lo trae; si no, la de siempre. */
  const volverA = (base: string, params: Record<string, string>) =>
    Response.redirect(`${base}?${new URLSearchParams(params)}`, 302)

  /*
   * Cuando la conexión se abrió en una ventana aparte, se vuelve a NUESTRA
   * pantalla con `ventana=1`, y esa pantalla avisa al panel y se cierra sola.
   *
   * POR QUÉ NO SE DEVUELVE UNA PÁGINA DESDE ACÁ
   * Se intentó: una página HTML mínima con un `postMessage` y un
   * `window.close()`. El gateway de Supabase PISA el `Content-Type` con
   * `text/plain` y agrega `nosniff`, así que el navegador muestra el código
   * fuente como texto y, sin charset, con los acentos rotos. Comprobado sobre
   * la función desplegada.
   *
   * Además de que no funciona, una página HTML no tenía por qué vivir en una
   * función de servidor: lo que se ve es asunto de la pantalla.
   */
  const cerrarVentana = (origen: string, params: Record<string, string>) =>
    Response.redirect(
      `${origen}/admin/meta?${new URLSearchParams({ ...params, ventana: '1' })}`, 302)
  const volver = (params: Record<string, string>) =>
    volverA(`${adminUrl}/meta`, params)

  try {
    switch (action) {

      /* ───────────────────────────────────────────────────────────────────
       * connect — mandar al usuario a Facebook
       * ─────────────────────────────────────────────────────────────────── */
      case 'connect': {
        /*
         * El token viaja por query porque esto es una NAVEGACIÓN, no un fetch:
         * el navegador se va a Facebook y no puede llevar un header. Es el
         * mismo mecanismo que usa ml-oauth.
         */
        const origenVentana = origenPermitido(url.searchParams.get('origen'), adminUrl)

        /* Un error acá, adentro de la ventana, no puede ser un JSON crudo: el
           usuario se queda mirando texto en una ventana sin nada que apretar.
           Se cierra y se avisa, igual que cuando sale bien. */
        const fallar = (mensaje: string) =>
          enVentana && origenVentana
            ? cerrarVentana(origenVentana, { meta_error: mensaje })
            : json({ error: mensaje }, 401)

        const token = url.searchParams.get('token')
        if (!token) return fallar('Falta el token de sesión.')

        const { data: quien, error: authError } = await supabase.auth.getUser(token)
        if (authError || !quien?.user) {
          return fallar('La sesión no es válida. Volvé a entrar y probá de nuevo.')
        }

        /* Los Secrets se revisan ANTES de mandar a nadie a Facebook. Si están
           mal, el error es nuestro y con nombre; si no, la única señal sería la
           pantalla genérica de Facebook, ya fuera del panel. */
        let appId: string
        try {
          appId = (await datosDeLaApp(supabase)).appId
        } catch (e) {
          return fallar(e instanceof Error ? e.message : String(e))
        }
        const redirectUri = urlDeVuelta(url)

        /* El `state` lleva de quién es la conexión. Es lo que evita el problema
           de ml-oauth, donde la credencial termina siendo del primer usuario
           del sistema y no del que la conectó. */
        /* De dónde vino, para volver ahí. Si no está en la lista se ignora y
           se vuelve a la de siempre: no se falla, se degrada. */
        const origen = origenVentana

        const state = btoa(JSON.stringify({
          userId:  quien.user.id,
          tenantId: url.searchParams.get('store_id') || null,
          origen,
          ventana: enVentana,
        }))

        const auth = new URL('https://www.facebook.com/v21.0/dialog/oauth')
        auth.searchParams.set('client_id',     appId)
        auth.searchParams.set('redirect_uri',  redirectUri)
        auth.searchParams.set('state',         state)
        auth.searchParams.set('scope',         permisosDe(url.searchParams.get('que') ?? 'meta'))
        auth.searchParams.set('response_type', 'code')
        return Response.redirect(auth.toString(), 302)
      }

      /* ───────────────────────────────────────────────────────────────────
       * callback — Meta nos devuelve el código y acá se resuelve todo
       * ─────────────────────────────────────────────────────────────────── */
      case 'callback': {
        /* Si el usuario dijo que no, Meta manda `error_description`. Se muestra
           tal cual: "el usuario canceló" no es lo mismo que "falta un permiso",
           y traducirlo a "no se pudo conectar" pierde justo esa diferencia. */
        const negado = url.searchParams.get('error_description') ?? url.searchParams.get('error')
        if (negado) return volver({ meta_error: negado })

        const code     = url.searchParams.get('code')
        const rawState = url.searchParams.get('state')
        if (!code || !rawState) return volver({ meta_error: 'Meta no devolvió el código.' })

        let state: {
          userId: string; tenantId: string | null
          origen?: string | null; ventana?: boolean
        }
        try { state = JSON.parse(atob(rawState)) }
        catch { return volver({ meta_error: 'El estado de la conexión llegó ilegible.' }) }

        /* Se vuelve a validar acá y no se confía en lo que trae el `state`: el
           `state` viaja por el navegador del usuario y vuelve de Facebook, así
           que es un dato de afuera aunque lo hayamos escrito nosotros. */
        const origenOk = origenPermitido(state.origen ?? null, adminUrl)
        const destino  = origenOk ? `${origenOk}/admin/meta` : `${adminUrl}/meta`

        /* En ventana aparte se cierra y avisa; si no, se redirige como siempre.
           Sin un origen validado no hay a quién avisarle, así que se redirige. */
        const volverAlOrigen = (params: Record<string, string>) =>
          state.ventana && origenOk
            ? cerrarVentana(origenOk, params)
            : volverA(destino, params)

        const { appId, appSecret } = await datosDeLaApp(supabase)
        const redirectUri = urlDeVuelta(url)

        /* 1 — el código por un token corto (una hora).
           Va con `fetch` y no con el helper `graph`, que asume que hay token:
           acá justamente todavía no hay ninguno. */
        const resCorto = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
          client_id: appId, client_secret: appSecret,
          redirect_uri: redirectUri, code,
        }))
        const datosCorto = await resCorto.json().catch(() => ({}))
        if (!resCorto.ok) {
          return volverAlOrigen({ meta_error: datosCorto?.error?.message ?? 'No se pudo canjear el código.' })
        }

        /* 2 — el token corto por uno largo (sesenta días)
           Sin este paso la conexión se cae sola en una hora, y el usuario no
           tendría forma de relacionar una cosa con la otra. */
        const resLargo = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId, client_secret: appSecret,
          fb_exchange_token: datosCorto.access_token,
        }))
        const datosLargo = await resLargo.json().catch(() => ({}))
        if (!resLargo.ok) {
          return volverAlOrigen({ meta_error: datosLargo?.error?.message ?? 'No se pudo alargar el token.' })
        }

        const tokenLargo = datosLargo.access_token as string
        const venceEn    = Date.now() + ((datosLargo.expires_in ?? 60 * 24 * 3600) * 1000)

        const escritas: Entrada[] = [
          { platform: 'Meta', name: 'META_APP_ID',           value: appId },
          { platform: 'Meta', name: 'META_LONG_LIVED_TOKEN', value: tokenLargo, expiraEn: venceEn },
        ]
        const resueltas: string[] = []

        /* 3 — las páginas. El token de PÁGINA es el que sirve para publicar,
           no el del usuario, y viene acá adentro. */
        const paginas = await graphOpcional('me/accounts', tokenLargo, {
          fields: 'id,name,access_token,instagram_business_account{id,username}',
        })
        const pagina = paginas?.data?.[0] ?? null

        if (pagina) {
          escritas.push(
            { platform: 'Facebook', name: 'FACEBOOK_PAGE_ID',           value: pagina.id },
            { platform: 'Facebook', name: 'FACEBOOK_PAGE_ACCESS_TOKEN', value: pagina.access_token },
          )
          resueltas.push('Facebook')

          /* 4 — Instagram cuelga de la página, no del usuario. Si la cuenta no
             es Business, o no está vinculada a la página, esto viene vacío: no
             es un error, es que falta hacerlo del lado de Instagram. */
          const ig = pagina.instagram_business_account
          if (ig?.id) {
            escritas.push(
              { platform: 'Instagram', name: 'INSTAGRAM_BUSINESS_ID', value: ig.id },
              /* El token de la página, a propósito: la cuenta Business se
                 consulta por el Graph de Facebook con el token de la página
                 que la tiene vinculada. */
              { platform: 'Instagram', name: 'INSTAGRAM_ACCESS_TOKEN', value: pagina.access_token },
            )
            if (ig.username) {
              escritas.push({ platform: 'Instagram', name: 'INSTAGRAM_IG_USER_ID', value: ig.id })
            }
            resueltas.push('Instagram')
          }
        }

        /* 5 — WhatsApp cuelga del negocio, que es otra rama. Se recorre porque
           una persona puede tener más de un negocio y sólo uno con WhatsApp. */
        const negocios = await graphOpcional('me/businesses', tokenLargo, { fields: 'id,name' })
        for (const negocio of negocios?.data ?? []) {
          const wabas = await graphOpcional(
            `${negocio.id}/owned_whatsapp_business_accounts`, tokenLargo, { fields: 'id,name' })
          const waba = wabas?.data?.[0]
          if (!waba) continue

          const numeros = await graphOpcional(
            `${waba.id}/phone_numbers`, tokenLargo, { fields: 'id,display_phone_number' })
          const numero = numeros?.data?.[0]
          if (!numero) continue

          escritas.push(
            { platform: 'WhatsApp', name: 'WHATSAPP_WABA_ID',          value: waba.id },
            { platform: 'WhatsApp', name: 'WHATSAPP_PHONE_NUMBER_ID',  value: numero.id },
            { platform: 'WhatsApp', name: 'WHATSAPP_ACCESS_TOKEN',     value: tokenLargo, expiraEn: venceEn },
          )
          resueltas.push('WhatsApp')
          break
        }

        for (const e of escritas) {
          await guardar(supabase, state.userId, state.tenantId, e)
        }

        /*
         * Se vuelve diciendo QUÉ quedó conectado, no "listo".
         *
         * Conectar Facebook y que Instagram no aparezca es el caso más común
         * —la cuenta no es Business, o no está vinculada a la página— y si la
         * pantalla dijera "conectado" a secas, el usuario buscaría el problema
         * en cualquier otro lado.
         */
        return volverAlOrigen({
          meta_connected: resueltas.join(',') || 'ninguna',
          meta_entradas:  String(escritas.length),
        })
      }

      /* ───────────────────────────────────────────────────────────────────
       * disconnect — borrar lo que escribió la conexión
       * ─────────────────────────────────────────────────────────────────── */
      case 'disconnect': {
        const cuerpo = await req.json().catch(() => ({}))
        const token  = cuerpo.token ?? url.searchParams.get('token')
        if (!token) return json({ error: 'Falta el token de sesión.' }, 401)

        const { data: quien, error: authError } = await supabase.auth.getUser(token)
        if (authError || !quien?.user) return json({ error: 'La sesión no es válida.' }, 401)

        /* Sólo las plataformas de Meta, y sólo las de este usuario. Borrar por
           tag 'meta' dejaría afuera las que alguien cargó a mano, que es
           justamente lo que también hay que sacar al desconectar. */
        const plataformas = cuerpo.platform
          ? [cuerpo.platform]
          : ['Meta', 'Instagram', 'Facebook', 'WhatsApp']

        const { error, count } = await supabase.from(TABLE)
          .delete({ count: 'exact' })
          .eq('user_id', quien.user.id)
          .in('platform', plataformas)
        if (error) throw error

        return json({ ok: true, borradas: count ?? 0, plataformas })
      }

      /* ───────────────────────────────────────────────────────────────────
       * diagnostico — qué está listo y qué falta, comprobado contra Meta
       *
       * Un tilde verde que se pone a mano no vale nada. Cada punto de acá se
       * responde llamando a algo: si la app existe, si el secreto es el que
       * corresponde, si hay página, si hay Instagram Business vinculado.
       *
       * Lo que NO se puede comprobar se dice "desconocido", no "ok". Los
       * requisitos de la cuenta no se pueden mirar sin permiso del dueño: Meta
       * no deja, y está bien que no deje. Después de conectar sí, y ahí se
       * responden solos.
       * ─────────────────────────────────────────────────────────────────── */
      case 'diagnostico': {
        const token = url.searchParams.get('token') ?? (await req.json().catch(() => ({}))).token
        if (!token) return json({ error: 'Falta el token de sesión.' }, 401)
        const { data: quien, error: authError } = await supabase.auth.getUser(token)
        if (authError || !quien?.user) return json({ error: 'La sesión no es válida.' }, 401)

        const puntos: {
          id: string; de: 'plataforma' | 'cuenta'; titulo: string
          estado: 'ok' | 'falta' | 'desconocido'; detalle: string
        }[] = []

        /* 1 — los Secrets */
        let appId = '', appSecret = ''
        try {
          const sec = await datosDeLaApp(supabase)
          appId = sec.appId; appSecret = sec.appSecret
          puntos.push({ id: 'secretos', de: 'plataforma',
            titulo: 'Los datos de la app están cargados',
            estado: 'ok', detalle: `Identificador ${appId}.` })
        } catch (e) {
          puntos.push({ id: 'secretos', de: 'plataforma',
            titulo: 'Los datos de la app están cargados',
            estado: 'falta',
            detalle: e instanceof Error ? e.message : String(e) })
        }

        /* 2 — que la app EXISTA y el secreto sea el suyo.
           Un token de app es `appId|appSecret`: si Meta contesta, los dos
           valores son correctos. Comprueba las dos cosas de una. */
        if (appId && appSecret) {
          const r = await fetch(`${GRAPH}/${appId}?fields=id,name&access_token=${appId}|${appSecret}`)
          const d = await r.json().catch(() => ({}))
          puntos.push(r.ok
            ? { id: 'app', de: 'plataforma', titulo: 'La app existe en Meta',
                estado: 'ok', detalle: `Es "${d.name ?? appId}".` }
            : { id: 'app', de: 'plataforma', titulo: 'La app existe en Meta',
                estado: 'falta',
                detalle: d?.error?.message ?? 'Meta no reconoce ese identificador o esa clave.' })
        }

        /*
         * 3 — el dominio y la URL registrados en Meta.
         *
         * Esto NO se puede leer por API, así que es lo único que queda a ojo. Se
         * dice "desconocido" y no "ok": el check anterior decía verde con sólo
         * mirar que el valor existiera, y aprobó un texto de ejemplo. Un control
         * que aprueba lo que está mal es peor que no tenerlo.
         *
         * La URL ya no puede estar mal —se deduce—, así que lo único que puede
         * faltar es que estén registradas del lado de Meta.
         */
        puntos.push({
          id: 'redirect', de: 'plataforma',
          titulo: 'El dominio y la URL están registrados en Meta',
          estado: 'desconocido',
          detalle: 'No se puede comprobar por API: los valores exactos están abajo, para copiar.',
        })

        /*
         * 4 — lo que Meta pide DESPUÉS de que la URL esté bien.
         *
         * Registrar el dominio no alcanza, y enterarse de a una cosa por vez
         * -cada una con un error distinto de Facebook- es el peor camino
         * posible. Van dichas antes de tropezarlas.
         *
         * Tampoco se leen por API, así que van en gris. Decirlas en verde sería
         * afirmar algo que no comprobamos; en rojo, acusar sin saber.
         */
        puntos.push({
          id: 'avanzado', de: 'plataforma',
          titulo: 'Los permisos tienen acceso avanzado',
          estado: 'desconocido',
          detalle: 'Con acceso estándar, Facebook Login no arranca y avisa. ' +
                   '`public_profile` se pasa a avanzado de un click y sin revisión; ' +
                   'publicar en Instagram y mandar WhatsApp sí necesitan revisión de Meta.',
        })

        puntos.push({
          id: 'modo', de: 'plataforma',
          titulo: 'La app está publicada, no en desarrollo',
          estado: 'desconocido',
          detalle: 'En desarrollo sólo pueden conectar las personas con un rol en la app. ' +
                   'Para probar vos alcanza; para que conecte una tienda, no.',
        })

        /* 4 — la cuenta. Sólo se puede después de conectar: sin permiso del
           dueño no hay forma de mirar, y está bien que no la haya. */
        const { data: guardado } = await supabase.from(TABLE)
          .select('value').eq('user_id', quien.user.id)
          .eq('platform', 'Meta').eq('name', 'META_LONG_LIVED_TOKEN')
          .maybeSingle()

        const sinConectar = (id: string, titulo: string, comoSeArregla: string) =>
          puntos.push({ id, de: 'cuenta', titulo, estado: 'desconocido',
            detalle: `Se comprueba al conectar. ${comoSeArregla}` })

        if (!guardado?.value) {
          sinConectar('pagina', 'Tenés una página de Facebook',
            'Instagram y WhatsApp cuelgan de ella.')
          sinConectar('instagram', 'Instagram es Business y está vinculado',
            'Una cuenta personal no aparece.')
          sinConectar('whatsapp', 'Tenés WhatsApp Business',
            'Sólo hace falta si vas a usar WhatsApp.')
        } else {
          const t = guardado.value as string

          const paginas = await graphOpcional('me/accounts', t, {
            fields: 'id,name,instagram_business_account{id,username}' })
          const pagina = paginas?.data?.[0] ?? null

          puntos.push(pagina
            ? { id: 'pagina', de: 'cuenta', titulo: 'Tenés una página de Facebook',
                estado: 'ok', detalle: `Es "${pagina.name}".` }
            : { id: 'pagina', de: 'cuenta', titulo: 'Tenés una página de Facebook',
                estado: 'falta',
                detalle: 'Esa cuenta no administra ninguna página. Instagram y WhatsApp cuelgan de una.' })

          const ig = pagina?.instagram_business_account
          puntos.push(ig?.id
            ? { id: 'instagram', de: 'cuenta', titulo: 'Instagram es Business y está vinculado',
                estado: 'ok', detalle: ig.username ? `Es @${ig.username}.` : 'Vinculado a la página.' }
            : { id: 'instagram', de: 'cuenta', titulo: 'Instagram es Business y está vinculado',
                estado: 'falta',
                detalle: 'La página no tiene ninguna cuenta de Instagram Business vinculada. Una cuenta personal no aparece.' })

          let waba: { id: string } | null = null
          const negocios = await graphOpcional('me/businesses', t, { fields: 'id' })
          for (const n of negocios?.data ?? []) {
            const w = await graphOpcional(`${n.id}/owned_whatsapp_business_accounts`, t, { fields: 'id' })
            if (w?.data?.[0]) { waba = w.data[0]; break }
          }
          puntos.push(waba
            ? { id: 'whatsapp', de: 'cuenta', titulo: 'Tenés WhatsApp Business',
                estado: 'ok', detalle: 'Encontrada en tu negocio de Meta.' }
            : { id: 'whatsapp', de: 'cuenta', titulo: 'Tenés WhatsApp Business',
                estado: 'falta',
                detalle: 'No hay ninguna cuenta de WhatsApp Business en tu negocio. Sólo hace falta si vas a usar WhatsApp.' })
        }

        /* El identificador viaja aparte para que la pantalla pueda armar el
           enlace a la configuración de ESA app. No es secreto: es público y
           viaja en cada URL de login. */
        return json({ ok: true, puntos, conectado: !!guardado?.value, appId })
      }

      /* ───────────────────────────────────────────────────────────────────
       * url — qué redirect_uri mandamos, exactamente
       *
       * No pide sesión a propósito: NO ES SECRETO. Viaja a la vista en cada
       * URL de login de Facebook, y esconderlo sólo lograría que nadie pueda
       * comprobar si coincide con lo registrado en Meta — que es justo la
       * causa más común de que la conexión no abra.
       *
       * Se dice también de DÓNDE sale. Con dos fuentes posibles, saber cuál
       * ganó es la mitad del problema.
       * ─────────────────────────────────────────────────────────────────── */
      case 'url': {
        return json({
          ok: true,
          usamos: urlDeVuelta(url),
          dominio: url.hostname,
        })
      }

      default:
        return json({ error: `Acción desconocida: "${action}". Son connect, callback, disconnect, diagnostico y url.` }, 400)
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err)
    console.error('[meta-oauth]', mensaje)
    /* Un error en el callback tiene que volver a la pantalla: si devolviera
       JSON, el usuario se queda mirando un texto crudo en una pestaña de
       Facebook, sin forma de volver. */
    if (action === 'callback') return volver({ meta_error: mensaje })
    return json({ ok: false, error: mensaje }, 500)
  }
})
