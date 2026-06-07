// ═══════════════════════════════════════════════════════════════
// @core/i18n — Español
// FUENTE ÚNICA DE VERDAD para todos los textos del ecosistema.
// Agregar aquí cualquier texto nuevo. Nunca en las apps.
// ═══════════════════════════════════════════════════════════════

export const es = {

  // ── Marca / Identidad ─────────────────────────────────────
  brand_name:               'CORE',
  brand_tagline:            'Global Supply. Regional Growth.',
  brand_claim:              'Others integrate software. CORE integrates operations.',
  brand_version:            'v1.0 — 2026',
  brand_confidential:       'Confidencial — Uso interno',
  brand_restricted:         'Acceso restringido · Solo personal autorizado',

  // ── Idiomas ───────────────────────────────────────────────
  lang_es:                  'ES',
  lang_en:                  'EN',
  lang_pt:                  'PT',

  // ── Navegación ────────────────────────────────────────────
  nav_home:                 'Inicio',
  nav_docs:                 'Documentación',
  nav_architecture:         'Arquitectura',
  nav_strategy:             'Estrategia',
  nav_roadmap:              'Roadmap',
  nav_products:             'Productos',
  nav_prompts:              'Prompts',
  nav_design:               'Design System',
  nav_foundation:           'Foundation',
  nav_settings:             'Configuración',
  nav_logout:               'Cerrar sesión',

  // ── Auth ──────────────────────────────────────────────────
  auth_login_title:         'Acceso Interno',
  auth_login_subtitle:      'Portal corporativo CORE — uso exclusivo del equipo.',
  auth_login_email:         'Correo electrónico',
  auth_login_password:      'Contraseña',
  auth_login_btn:           'Ingresar',
  auth_login_loading:       'Verificando...',
  auth_login_forgot:        'Olvidé mi contraseña',
  auth_login_no_account:    '¿No tenés cuenta?',
  auth_login_register_link: 'Registrate',
  auth_login_err_invalid:   'Credenciales incorrectas.',
  auth_login_err_generic:   'Error al iniciar sesión. Intentá de nuevo.',

  auth_register_title:      'Crear cuenta',
  auth_register_subtitle:   'Completá tus datos para registrarte.',
  auth_register_name:       'Nombre completo',
  auth_register_email:      'Correo electrónico',
  auth_register_password:   'Contraseña',
  auth_register_confirm:    'Confirmar contraseña',
  auth_register_btn:        'Crear cuenta',
  auth_register_loading:    'Creando cuenta...',
  auth_register_has_account:'¿Ya tenés cuenta?',
  auth_register_login_link: 'Ingresá',
  auth_register_err_match:  'Las contraseñas no coinciden.',
  auth_register_err_short:  'La contraseña debe tener al menos 6 caracteres.',
  auth_register_err_generic:'Error al registrarse. Intentá de nuevo.',
  auth_register_success:    '¡Cuenta creada! Revisá tu email para confirmar.',

  auth_verify_title:        'Verificá tu email',
  auth_verify_subtitle:     'Te enviamos un link de confirmación a',
  auth_verify_resend:       'Reenviar email',
  auth_verify_resend_ok:    'Email reenviado.',
  auth_verify_back:         'Volver al login',

  auth_forgot_title:        'Recuperar contraseña',
  auth_forgot_subtitle:     'Ingresá tu email y te enviamos un link.',
  auth_forgot_btn:          'Enviar link',
  auth_forgot_loading:      'Enviando...',
  auth_forgot_success:      'Te enviamos un email para recuperar tu contraseña.',
  auth_forgot_back:         'Volver al login',
  auth_forgot_err_generic:  'Error al enviar el email. Intentá de nuevo.',

  auth_reset_title:         'Nueva contraseña',
  auth_reset_subtitle:      'Ingresá tu nueva contraseña.',
  auth_reset_password:      'Nueva contraseña',
  auth_reset_confirm:       'Confirmar contraseña',
  auth_reset_btn:           'Guardar contraseña',
  auth_reset_loading:       'Guardando...',
  auth_reset_success:       '¡Contraseña actualizada! Ya podés ingresar.',
  auth_reset_err_match:     'Las contraseñas no coinciden.',
  auth_reset_err_short:     'La contraseña debe tener al menos 6 caracteres.',
  auth_reset_err_generic:   'Error al actualizar la contraseña.',

  auth_change_title:        'Cambiar contraseña',
  auth_change_current:      'Contraseña actual',
  auth_change_new:          'Nueva contraseña',
  auth_change_confirm:      'Confirmar nueva contraseña',
  auth_change_btn:          'Actualizar',
  auth_change_success:      'Contraseña actualizada correctamente.',
  auth_change_err_match:    'Las contraseñas no coinciden.',
  auth_change_err_generic:  'Error al cambiar la contraseña.',

  auth_show_password:       'Mostrar contraseña',
  auth_hide_password:       'Ocultar contraseña',

  // ── workspace / Dashboard ───────────────────────────────────────
  hub_welcome:              'Bienvenido',
  hub_subtitle:             'Seleccioná el portal al que querés acceder.',
  hub_section_live:         'PORTALES ACTIVOS',
  hub_section_dev:          'EN DESARROLLO',
  hub_access:               'Acceder',
  hub_soon:                 'Próximamente',
  hub_wip:                  'En desarrollo',

  // ── Portales del ecosistema ───────────────────────────────
  portal_hub_name:          'CORE workspace',
  portal_hub_desc:          'Portal de acceso único al ecosistema interno.',
  portal_biblio_name:           'Biblioteca',
  portal_biblio_desc:       'Documentación oficial — Arquitectura, Estrategia, Prompts y Roadmap.',
  portal_foundation_name:   'Foundation',
  portal_foundation_desc:   'Blueprint estratégico y técnico del ecosistema 2026–2035.',
  portal_marketing_name:    'Marketing',
  portal_marketing_desc:    'Decks, presentaciones, pitches y materiales de marketing.',
  portal_market_name:           'Market',
  portal_market_desc:       'Plataforma de comercio B2B, B2C y D2C para Latinoamérica.',
  portal_logistics_name:    'CORE Logistics',
  portal_logistics_desc:    'Gestión logística integral — WMS, TMS y última milla.',
  portal_customs_name:      'CORE Customs',
  portal_customs_desc:      'Gestión aduanera — imports, exports, zonas francas.',
  portal_intelligence_name: 'CORE Intelligence',
  portal_intelligence_desc: 'Analítica operacional e inteligencia de negocio.',
  portal_finance_name:      'CORE Finance',
  portal_finance_desc:      'Gestión financiera multi-moneda y multi-país.',

  // ── Estados ───────────────────────────────────────────────
  status_live:              'Activo',
  status_dev:               'En desarrollo',
  status_planned:           'Planificado',
  status_soon:              'Próximamente',
  status_new:               'Nuevo',

  // ── Acciones comunes ──────────────────────────────────────
  action_save:              'Guardar',
  action_cancel:            'Cancelar',
  action_delete:            'Eliminar',
  action_edit:              'Editar',
  action_create:            'Crear',
  action_add:               'Agregar',
  action_remove:            'Quitar',
  action_search:            'Buscar',
  action_filter:            'Filtrar',
  action_export:            'Exportar',
  action_import:            'Importar',
  action_back:              'Volver',
  action_next:              'Siguiente',
  action_prev:              'Anterior',
  action_close:             'Cerrar',
  action_confirm:           'Confirmar',
  action_loading:           'Cargando...',
  action_retry:             'Reintentar',
  action_send:              'Enviar',
  action_submit:            'Enviar',
  action_view:              'Ver',
  action_download:          'Descargar',
  action_upload:            'Subir',
  action_copy:              'Copiar',
  action_copied:            'Copiado',
  action_share:             'Compartir',
  action_print:             'Imprimir',
  action_refresh:           'Actualizar',
  action_expand:            'Expandir',
  action_collapse:          'Colapsar',
  action_select_all:        'Seleccionar todo',
  action_deselect_all:      'Deseleccionar todo',

  // ── Feedback / Mensajes ───────────────────────────────────
  error_generic:            'Algo salió mal. Intentá de nuevo.',
  error_network:            'Error de conexión. Verificá tu internet.',
  error_not_found:          'No encontrado.',
  error_unauthorized:       'No tenés permiso para ver esto.',
  error_required:           'Este campo es requerido.',
  error_invalid_email:      'El email no es válido.',
  error_invalid_format:     'El formato no es válido.',
  success_saved:            'Guardado correctamente.',
  success_deleted:          'Eliminado correctamente.',
  success_created:          'Creado correctamente.',
  success_updated:          'Actualizado correctamente.',
  success_sent:             'Enviado correctamente.',
  success_copied:           'Copiado al portapapeles.',
  info_no_results:          'No hay resultados.',
  info_loading:             'Cargando...',
  info_empty:               'No hay elementos para mostrar.',

  // ── Contenido editorial — presentaciones / landing ────────
  content_hero_tagline:     'El Sistema Operativo del Comercio',
  content_hero_sub:         'Conectando marcas, operaciones y mercados.',
  content_hero_scroll:      'Explorar',
  content_hero_cta:         'Solicitar acceso',
  content_hero_cta_alt:     'Hablar con un especialista',

  content_claim_before:     'Otros integran software.',
  content_claim_after:      'CORE integra operaciones.',

  content_fragmentation_opening:  'Ya tenés el software.',
  content_fragmentation_problem_a:'El problema no es el software.',
  content_fragmentation_problem_b:'El problema es la fragmentación.',

  content_cost_title:       'El costo de operar fragmentado',
  content_cost_quote:       'Las empresas pasan años integrando herramientas que nunca fueron diseñadas para trabajar juntas.',

  content_whatif_question:  '¿Y si todo empezara conectado?',
  content_whatif_sub:       'Una única fuente de verdad. No otra integración. Un punto de partida diferente.',

  content_foundation_label: 'CORE Foundation',
  content_foundation_title: 'El núcleo operacional',
  content_foundation_sub:   'No es una base de datos. Es la verdad operacional.',

  content_ecosystem_label:  'El ecosistema CORE',
  content_ecosystem_title:  'Capacidades, no módulos.',
  content_ecosystem_sub:    'Todo comparte la misma fundación operacional.',

  content_difference_label:       'Por qué CORE es diferente',
  content_difference_before_label:'Modelo tradicional',
  content_difference_after_label: 'Modelo CORE',

  content_global_label:     'Alcance global',
  content_global_title:     'Nacido en Sudamérica. No limitado a Sudamérica.',
  content_global_sub:       'CORE se convierte en el gateway operacional entre marcas globales y mercados regionales.',

  content_vision_label:     'Visión 2035',
  content_vision_title:     'Infraestructura, no software.',

  content_paraguay_label:   'Caso real · Paraguay → Uruguay',
  content_paraguay_title:   'Operá en un nuevo país sin construir una nueva operación.',
  content_paraguay_before:  'Sin CORE',
  content_paraguay_after:   'Con CORE',

  content_cardisan_label:   'Caso real · Cardisan · LATAM',
  content_cardisan_title:   'Expandí tu mercado, no tu complejidad.',
  content_cardisan_desc:    'Carnes premium, chacinados y productos gourmet. Un ecosistema operacional para toda América Latina.',

  // ── Glosario ──────────────────────────────────────────────
  glossary_label:           'GLOSARIO OPERATIVO',
  glossary_title:           'El idioma del comercio real.',
  glossary_sub:             'Cada término con su definición, contexto y ejemplo práctico.',
  glossary_search:          'Buscar término...',

  // ── Market / Marketplace ──────────────────────────────────
  market_search_placeholder:'encontrá lo que buscás',
  market_login_btn:         'Ingresar',
  market_cart:              'Carrito',
  market_buy:               'Comprar',
  market_add_to_cart:       'Agregar al carrito',
  market_second_hand:       'Segunda Mano',
  market_featured:          'Destacados',
  market_see_all:           'Ver todas →',
  market_publications:      'Publicaciones',
  market_price:             'Precio',
  market_category:          'Categoría',
  market_condition:         'Condición',
  market_seller:            'Vendedor',
  market_qty:               'Cantidad',

  // ── Expansión global ──────────────────────────────────────
  expansion_phase_active:   'Activo',
  expansion_phase_planned:  'Planificado',
  expansion_phase_horizon:  'Horizonte',


  // ── Workspace app: login / dashboard ──
  login_title: 'Acceso Interno',
  login_subtitle: 'Portal corporativo CORE — uso exclusivo del equipo.',
  login_email: 'Correo electrónico',
  login_password: 'Contraseña',
  login_button: 'Ingresar',
  login_loading: 'Verificando...',
  login_error_invalid: 'Credenciales incorrectas. Verificá los datos.',
  login_error_generic: 'Error al iniciar sesión. Intentá nuevamente.',
  login_confidential: 'Confidencial — Uso interno',
  dashboard_welcome: 'Bienvenido',
  dashboard_subtitle: 'Seleccioná el portal al que querés acceder.',
  dashboard_logout: 'Cerrar sesión',
  dashboard_version: 'v1.0 — 2026',
  dashboard_confidential: 'Confidencial — Uso interno',
  dashboard_section_public: 'PORTALES ACTIVOS — PÚBLICOS',
  dashboard_section_live: 'PORTALES ACTIVOS — ACCESO RESTRINGIDO',
  dashboard_section_dev: 'EN DESARROLLO — ACCESO RESTRINGIDO',
  dashboard_access: 'Acceder',
  dashboard_soon: 'Próximamente',
  dashboard_wip: 'En desarrollo',
  portal_landing_name: 'CORE',
  portal_landing_desc: 'Sitio institucional del ecosistema CORE — core.com.uy',
} as const

export type TranslationKeys = keyof typeof es


