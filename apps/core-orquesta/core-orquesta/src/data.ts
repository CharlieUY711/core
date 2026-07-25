// ─── Types ───────────────────────────────────────────────────────────────────

export type MotorStatus = "active" | "inactive" | "error";
export type SignalPriority = "alta" | "media" | "baja";
export type SignalStatus = "nueva" | "procesada" | "ignorada";
export type EventType = "expansion" | "financiero" | "talento" | "producto" | "alianza" | "riesgo";
export type CompanyActivity = "high" | "medium" | "low";

export interface Motor {
  id: string;
  name: string;
  description: string;
  version: string;
  status: MotorStatus;
  icon: string;
  lastRun: string;
  logs: Array<{ time: string; text: string }>;
  companies: string[];
  interval: number;
  sources: string[];
  detailLevel: string;
  fallback: string;
  credentials: Array<{ name: string; loaded: boolean }>;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  activity: CompanyActivity;
  summary: string;
  verticals: Array<{ label: string; value: string; icon: string; color: string }>;
}

export interface Signal {
  id: string;
  title: string;
  description: string;
  source: string;
  motor: string;
  motorIcon: string;
  priority: SignalPriority;
  status: SignalStatus;
  companyId: string;
  time: string;
}

export interface OrchestratorEvent {
  id: string;
  date: string;
  motorId: string;
  motorName: string;
  motorIcon: string;
  type: EventType;
  description: string;
  companyId: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOTORS: Motor[] = [
  {
    id: "m1",
    name: "Monitor de Noticias",
    description: "Rastreo de medios, feeds RSS y prensa digital",
    version: "2.1.4",
    status: "active",
    icon: "rss",
    lastRun: "hace 3 min",
    logs: [
      { time: "18:42", text: "✓ 12 artículos procesados correctamente" },
      { time: "18:38", text: "✓ Señal generada: Expansión LATAM" },
      { time: "18:30", text: "↻ Reintentando fuente no disponible..." },
    ],
    companies: ["TechCorp Uruguay", "InnovaGroup"],
    interval: 15,
    sources: ["rss", "web", "api"],
    detailLevel: "Detallado",
    fallback: "Si falla la fuente → reintentar",
    credentials: [
      { name: "NEWS_API_KEY", loaded: true },
      { name: "RSS_AUTH_TOKEN", loaded: true },
    ],
  },
  {
    id: "m2",
    name: "Web Scraper",
    description: "Extracción de datos web y scraping inteligente",
    version: "3.0.1",
    status: "active",
    icon: "globe",
    lastRun: "hace 8 min",
    logs: [
      { time: "18:35", text: "✓ Scraping completado: 5 sitios web" },
      { time: "18:33", text: "⚠ Sitio bloqueado: portal-ejemplo.com" },
      { time: "18:20", text: "✓ Datos guardados en contexto activo" },
    ],
    companies: ["RetailCo", "Logística SA", "TechCorp Uruguay"],
    interval: 30,
    sources: ["web", "db"],
    detailLevel: "Estándar",
    fallback: "Si no hay datos nuevos → esperar",
    credentials: [
      { name: "SCRAPER_AUTH_TOKEN", loaded: true },
      { name: "PROXY_KEY", loaded: false },
    ],
  },
  {
    id: "m3",
    name: "Analizador de Señales",
    description: "Procesamiento y clasificación de señales por IA",
    version: "1.8.2",
    status: "active",
    icon: "trending",
    lastRun: "hace 1 min",
    logs: [
      { time: "18:44", text: "✓ 3 señales clasificadas (Alta prioridad)" },
      { time: "18:44", text: "✓ Relaciones actualizadas en el grafo" },
      { time: "18:43", text: "✓ Perfil contextual enriquecido" },
    ],
    companies: ["TechCorp Uruguay", "RetailCo", "InnovaGroup"],
    interval: 5,
    sources: ["api", "db"],
    detailLevel: "Verbose",
    fallback: "Si hay demasiados eventos → limitar",
    credentials: [
      { name: "AI_MODEL_KEY", loaded: true },
      { name: "VECTOR_DB_URL", loaded: true },
    ],
  },
  {
    id: "m4",
    name: "Conector de BD",
    description: "Sincronización con fuentes de datos internas",
    version: "1.2.0",
    status: "error",
    icon: "database",
    lastRun: "hace 42 min",
    logs: [
      { time: "18:01", text: "✗ Error de conexión: timeout (5 000 ms)" },
      { time: "18:00", text: "✗ Reintento 3/3 fallido" },
      { time: "17:58", text: "⚠ Credencial DB_CONN_STR inválida o expirada" },
    ],
    companies: [],
    interval: 60,
    sources: ["db"],
    detailLevel: "Básico",
    fallback: "Si hay error de credenciales → notificar",
    credentials: [
      { name: "DB_CONNECTION_STR", loaded: false },
      { name: "DB_USER", loaded: true },
      { name: "DB_PASSWORD", loaded: false },
    ],
  },
  {
    id: "m5",
    name: "Notificador Email",
    description: "Alertas automáticas y reportes por email",
    version: "1.0.3",
    status: "inactive",
    icon: "mail",
    lastRun: "hace 2 días",
    logs: [
      { time: "—", text: "— Motor detenido manualmente" },
      { time: "—", text: "— Última alerta: 22/02/2026 09:10" },
      { time: "—", text: "— Cola pendiente: 0 mensajes" },
    ],
    companies: [],
    interval: 120,
    sources: ["api"],
    detailLevel: "Básico",
    fallback: "Si falla la fuente → reintentar",
    credentials: [
      { name: "SMTP_HOST", loaded: true },
      { name: "SMTP_API_KEY", loaded: false },
    ],
  },
];

export const COMPANIES: Company[] = [
  {
    id: "techcorp",
    name: "TechCorp Uruguay",
    industry: "Software · B2B SaaS",
    location: "Montevideo, UY",
    size: "180–220 empleados",
    activity: "high",
    summary:
      "Empresa de software en expansión activa en el mercado LATAM. Detectadas señales de crecimiento agresivo en contratación y nuevos mercados. Posible oportunidad comercial en ventana Q1 2026.",
    verticals: [
      { label: "Financiero", value: "Crecimiento 12% YoY", icon: "trending", color: "blue" },
      { label: "Expansión", value: "3 nuevos mercados LATAM", icon: "globe", color: "emerald" },
      { label: "Talento", value: "+40 empleados en Q4", icon: "users", color: "violet" },
      { label: "Producto", value: "2 lanzamientos planificados", icon: "package", color: "amber" },
      { label: "Competencia", value: "Posición #2 en segmento", icon: "award", color: "rose" },
    ],
  },
  {
    id: "retailco",
    name: "RetailCo",
    industry: "Retail · eCommerce",
    location: "Buenos Aires, AR",
    size: "500–800 empleados",
    activity: "medium",
    summary:
      "Empresa de retail en transición digital. Señales mixtas: crecimiento en canal online pero presión en márgenes físicos. Riesgo de servicio detectado en Q4.",
    verticals: [
      { label: "Financiero", value: "Márgenes bajo presión", icon: "trending", color: "amber" },
      { label: "Digital", value: "eCommerce +22% MoM", icon: "globe", color: "blue" },
      { label: "Riesgo", value: "Falla de servicio detectada", icon: "alert", color: "red" },
      { label: "Talento", value: "Reestructuración activa", icon: "users", color: "violet" },
    ],
  },
  {
    id: "innovagroup",
    name: "InnovaGroup",
    industry: "Consultoría · Innovación",
    location: "Montevideo, UY",
    size: "50–80 empleados",
    activity: "medium",
    summary:
      "Consultora boutique con expansión regional en curso. Partnership reciente con empresa de logística. Señales de internacionalización hacia México y Colombia.",
    verticals: [
      { label: "Expansión", value: "Registro legal en MX/CO", icon: "globe", color: "emerald" },
      { label: "Alianzas", value: "1 nuevo partnership", icon: "award", color: "blue" },
      { label: "Talento", value: "Búsqueda regional activa", icon: "users", color: "violet" },
    ],
  },
  {
    id: "logistica",
    name: "Logística SA",
    industry: "Logística · Transporte",
    location: "Montevideo, UY",
    size: "300–500 empleados",
    activity: "low",
    summary:
      "Empresa de logística regional con actividad monitoreada de baja frecuencia. Sin señales críticas activas.",
    verticals: [
      { label: "Operaciones", value: "Rutas estables regionales", icon: "package", color: "slate" },
      { label: "Financiero", value: "Sin cambios detectados", icon: "trending", color: "slate" },
    ],
  },
];

export const SIGNALS: Signal[] = [
  { id: "s1", title: "Expansión agresiva detectada", description: "TechCorp anuncia apertura de 3 nuevas oficinas en LATAM durante Q1 2026.", source: "El Economista", motor: "Monitor de Noticias", motorIcon: "rss", priority: "alta", status: "nueva", companyId: "techcorp", time: "hace 5 min" },
  { id: "s2", title: "Pico de contratación de ingenieros", description: "+40 posiciones abiertas en LinkedIn para roles técnicos senior.", source: "LinkedIn Scraper", motor: "Web Scraper", motorIcon: "globe", priority: "alta", status: "nueva", companyId: "techcorp", time: "hace 18 min" },
  { id: "s3", title: "Mención positiva en comunidad SaaS", description: "Discusión activa en foros especializados sobre el producto.", source: "Reddit · HackerNews", motor: "Web Scraper", motorIcon: "globe", priority: "media", status: "procesada", companyId: "techcorp", time: "hace 1 h" },
  { id: "s4", title: "Serie B cerrada exitosamente", description: "Ronda de USD 12 M cerrada con inversores locales y regionales.", source: "Crunchbase", motor: "Monitor de Noticias", motorIcon: "rss", priority: "alta", status: "procesada", companyId: "techcorp", time: "hace 3 h" },
  { id: "s5", title: "Precio de competidor reducido 15%", description: "RetailCo ajustó precios en su segmento principal de retail.", source: "Monitor de precios", motor: "Analizador", motorIcon: "trending", priority: "media", status: "nueva", companyId: "retailco", time: "hace 2 h" },
  { id: "s6", title: "Falla de servicio de pagos", description: "Reportes de usuarios sobre falla en procesamiento de pagos online.", source: "Twitter · Status page", motor: "Web Scraper", motorIcon: "globe", priority: "alta", status: "nueva", companyId: "retailco", time: "hace 4 h" },
  { id: "s7", title: "Partnership logístico anunciado", description: "Alianza estratégica con empresa de distribución regional.", source: "Portal empresarial", motor: "Monitor de Noticias", motorIcon: "rss", priority: "media", status: "nueva", companyId: "innovagroup", time: "hace 6 h" },
  { id: "s8", title: "Cambio en términos de servicio", description: "Actualización menor detectada en documentos legales públicos.", source: "Web Scraper", motor: "Web Scraper", motorIcon: "globe", priority: "baja", status: "ignorada", companyId: "retailco", time: "hace 8 h" },
];

export const EVENTS: OrchestratorEvent[] = [
  { id: "e1", date: "24/02/2026 18:42", motorId: "m1", motorName: "Monitor Noticias", motorIcon: "rss", type: "expansion", description: "Apertura de nueva sede en Montevideo confirmada por CEO.", companyId: "techcorp" },
  { id: "e2", date: "24/02/2026 16:20", motorId: "m2", motorName: "Web Scraper", motorIcon: "globe", type: "talento", description: "40 nuevas posiciones senior publicadas en plataformas de empleo.", companyId: "techcorp" },
  { id: "e3", date: "24/02/2026 14:05", motorId: "m3", motorName: "Analizador", motorIcon: "trending", type: "financiero", description: "Variación de precio de acción +8.2% en sesión de mercado.", companyId: "retailco" },
  { id: "e4", date: "23/02/2026 20:30", motorId: "m1", motorName: "Monitor Noticias", motorIcon: "rss", type: "alianza", description: "Anuncio de partnership estratégico con empresa logística regional.", companyId: "innovagroup" },
  { id: "e5", date: "23/02/2026 11:18", motorId: "m2", motorName: "Web Scraper", motorIcon: "globe", type: "producto", description: "Lanzamiento de integración con Salesforce CRM documentada.", companyId: "techcorp" },
  { id: "e6", date: "22/02/2026 09:45", motorId: "m2", motorName: "Web Scraper", motorIcon: "globe", type: "riesgo", description: "Falla en servicio de pagos reportada por usuarios en redes.", companyId: "retailco" },
  { id: "e7", date: "21/02/2026 17:22", motorId: "m1", motorName: "Monitor Noticias", motorIcon: "rss", type: "financiero", description: "Reporte Q4 2025: ingresos USD 4.2 M, EBITDA positivo.", companyId: "techcorp" },
  { id: "e8", date: "20/02/2026 13:10", motorId: "m3", motorName: "Analizador", motorIcon: "trending", type: "expansion", description: "Registro de entidad legal en México y Colombia verificado.", companyId: "innovagroup" },
  { id: "e9", date: "19/02/2026 10:00", motorId: "m1", motorName: "Monitor Noticias", motorIcon: "rss", type: "talento", description: "Nuevo CTO incorporado con experiencia en infraestructura cloud.", companyId: "techcorp" },
  { id: "e10", date: "18/02/2026 15:33", motorId: "m3", motorName: "Analizador", motorIcon: "trending", type: "alianza", description: "Mención positiva en informe sectorial de consultoría líder.", companyId: "innovagroup" },
];
