export type Locale = "es" | "pt" | "en";

const glosario_es = {
  label: "GLOSARIO OPERATIVO",
  title: "El idioma del comercio real.",
  sub: "Cada término con su definición, contexto y ejemplo práctico.",
  search: "Buscar término...",
  terms: [
    { term: "B2B", definition: "Business to Business. Comercio entre empresas.", context: "Transacciones donde tanto el vendedor como el comprador son organizaciones.", example: "Una distribuidora que vende a supermercados opera en B2B." },
    { term: "B2C", definition: "Business to Consumer. Comercio entre empresa y consumidor final.", context: "El canal más directo entre marca y usuario.", example: "Un ecommerce que vende directamente al comprador final." },
    { term: "SKU", definition: "Stock Keeping Unit. Código único de identificación de producto.", context: "Permite diferenciar variantes de un mismo artículo: talle, color, versión.", example: "Remera azul talle M = SKU distinto a Remera azul talle L." },
    { term: "Marketplace", definition: "Plataforma que conecta múltiples vendedores con compradores.", context: "Opera como infraestructura comercial neutral entre oferta y demanda.", example: "CORE Market conecta marcas con distribuidores y retailers." },
    { term: "Distribuidor", definition: "Empresa que compra en volumen y revende a terceros.", context: "Opera como intermediario entre fabricante y puntos de venta.", example: "Un distribuidor regional que abastece 200 farmacias." },
    { term: "Retail", definition: "Canal de venta al consumidor final en formato físico.", context: "Supermercados, tiendas especializadas, cadenas de proximidad.", example: "Cardisan vendiendo jamones en cadenas de supermercados." },
    { term: "Horeca", definition: "HOteles, REstaurantes y CAtering.", context: "Canal de distribución especializado en gastronomía y hospitalidad.", example: "Cardisan distribuyendo embutidos gourmet a restaurantes." },
    { term: "Fulfillment", definition: "Proceso completo de preparación y entrega de un pedido.", context: "Incluye picking, packing, despacho y trazabilidad.", example: "CORE gestiona el fulfillment desde el depósito hasta el cliente." },
    { term: "Cross Docking", definition: "Transferencia directa de mercadería sin almacenamiento intermedio.", context: "Reduce tiempos y costos eliminando el paso de depósito.", example: "Camión descarga en plataforma y carga directamente al destino." },
    { term: "Última Milla", definition: "Último tramo de entrega: depósito al cliente final.", context: "El segmento más costoso y crítico de la logística.", example: "CORE Logistics gestiona la última milla en cada ciudad." },
    { term: "Zona Franca", definition: "Territorio con régimen aduanero especial y beneficios fiscales.", context: "Permite operar en un país con menor carga impositiva y agilidad logística.", example: "La empresa paraguaya ingresa mercadería a Uruguay vía Zona Franca." },
    { term: "DUA", definition: "Documento Único Aduanero. Declaración para tráfico internacional de mercancías.", context: "Obligatorio para importación y exportación en países del Mercosur.", example: "CORE gestiona el DUA en cada operación de importación." },
    { term: "NCM", definition: "Nomenclatura Común del Mercosur. Código de clasificación arancelaria.", context: "Determina aranceles e impuestos aplicables a cada producto.", example: "Cada SKU en CORE tiene su NCM asignado." },
    { term: "Trade Marketing", definition: "Estrategias de marketing orientadas al canal de distribución.", context: "Visibilidad en punto de venta, promociones para distribuidores, activaciones.", example: "Cardisan midiendo el impacto de exhibiciones en góndola con CORE Intelligence." },
    { term: "Factoring", definition: "Financiamiento mediante la cesión de cuentas por cobrar.", context: "Permite adelantar liquidez sin esperar el vencimiento de facturas.", example: "CORE Finance adelanta el cobro de facturas B2B a 90 días." },
    { term: "FX", definition: "Foreign Exchange. Operaciones de cambio de divisas.", context: "Gestión del riesgo cambiario en operaciones internacionales.", example: "CORE Finance gestiona FX en operaciones entre Paraguay y Uruguay." },
    { term: "Inventario", definition: "Conjunto de productos disponibles en un punto de almacenamiento.", context: "Stock disponible, comprometido y en tránsito.", example: "CORE muestra inventario en tiempo real en todos los depósitos." },
    { term: "DirectShipment", definition: "Envío directo desde origen al destino sin depósito intermedio.", context: "Reduce tiempos y costos de almacenamiento.", example: "Fabricante envía directamente al cliente final sin pasar por distribuidor." },
    { term: "Representación Comercial", definition: "Gestión de marcas en un territorio como intermediario especializado.", context: "El representante actúa en nombre de la marca ante el mercado.", example: "CORE Rep representa marcas internacionales en el Cono Sur." },
  ],
};

const glosario_pt = {
  label: "GLOSSÁRIO OPERACIONAL",
  title: "A linguagem do comércio real.",
  sub: "Cada termo com sua definição, contexto e exemplo prático.",
  search: "Buscar termo...",
  terms: [] as typeof glosario_es.terms,
};

const glosario_en = {
  label: "OPERATIONAL GLOSSARY",
  title: "The language of real commerce.",
  sub: "Each term with its definition, context and practical example.",
  search: "Search term...",
  terms: [] as typeof glosario_es.terms,
};

export const translations = {
  es: {
    nav: {
      cta: "Solicitar acceso",
    },
    hero: {
      tagline: "The Operating System for Commerce",
      sub: "Connecting Brands, Operations and Markets.",
      scroll: "Explorar",
    },
    fragmentation: {
      opening: "Ya tenés el software.",
      problem_a: "El problema no es el software.",
      problem_b: "El problema es la fragmentación.",
      systems: ["CRM", "ERP", "Marketplace", "Warehouse", "Logística", "Aduana", "BI", "Pagos", "Documentos"],
    },
    cost: {
      title: "El costo de operar fragmentado",
      items: [
        "Clientes duplicados",
        "Inventario duplicado",
        "Procesos duplicados",
        "Trabajo manual constante",
        "Decisiones sin visibilidad",
        "Múltiples versiones de la verdad",
      ],
      quote: "Las empresas pasan años integrando herramientas que nunca fueron diseñadas para trabajar juntas.",
    },
    whatif: {
      question: "¿Y si todo empezara conectado?",
      sub: "Una única fuente de verdad. No otra integración. Un punto de partida diferente.",
      primitives: ["Entidad", "Producto", "Operación", "Relación", "Documento", "Evento"],
    },
    foundation: {
      label: "CORE Foundation",
      title: "El núcleo operacional",
      sub: "No es una base de datos. Es la verdad operacional.",
      nodes: ["Entidades", "Marcas", "Productos", "Clientes", "Documentos", "Operaciones", "Inventario", "Eventos"],
    },
    ecosystem: {
      label: "El ecosistema CORE",
      title: "Capacidades, no módulos.",
      sub: "Todo comparte la misma fundación operacional.",
      capabilities: [
        { id: "rep", name: "CORE Rep", desc: "Tu fuerza comercial conectada a cada producto, precio y cliente en tiempo real." },
        { id: "logistics", name: "CORE Logistics", desc: "Red territorial de movimiento. Rutas, warehouses y nodos operacionales." },
        { id: "directshipment", name: "CORE DirectShipment", desc: "Comercio directo. Origen a destino con fricción mínima." },
        { id: "market", name: "CORE Market", desc: "Red comercial. Acceso a mercados, canales y relaciones de negocio." },
        { id: "finance", name: "CORE Finance", desc: "Flujos de capital. Liquidez y financiamiento operacional." },
        { id: "intelligence", name: "CORE Intelligence", desc: "Patrones e insights que emergen de tu operación completa." },
      ],
    },
    paraguay: {
      label: "Caso real · Paraguay → Uruguay",
      title: "Operá en un nuevo país sin construir una nueva operación.",
      before_label: "Sin CORE",
      after_label: "Con CORE",
      before: ["Estructura legal", "Buscar logística", "Buscar warehouse", "Integrar software", "Gestionar aduana", "Gestionar inventario", "Gestionar entregas"],
      after: ["Productos ingresan", "Zona Franca", "Inventario", "Distribución", "Market", "Última Milla", "Cliente ✓"],
    },
    cardisan: {
      label: "Caso real · Cardisan · LATAM",
      title: "Expandí tu mercado, no tu complejidad.",
      desc: "Carnes premium, chacinados y productos gourmet. Un ecosistema operacional para toda América Latina.",
    },
    difference: {
      label: "Por qué CORE es diferente",
      before_label: "Modelo tradicional",
      after_label: "Modelo CORE",
      before: ["Muchos sistemas", "Muchos proveedores", "Muchas integraciones", "Muchas verdades"],
      after: ["Una entidad", "Un producto", "Una operación", "Una verdad"],
    },
    global: {
      label: "Alcance global",
      title: "Nacido en Sudamérica.\nNo limitado a Sudamérica.",
      sub: "CORE se convierte en el gateway operacional entre marcas globales y mercados regionales.",
      regions: ["Europa", "Asia", "Norte América"],
    },
    vision: {
      label: "Visión 2035",
      title: "Infraestructura, no software.",
      stats: [
        { value: 50000, suffix: "", label: "empresas" },
        { value: 2, suffix: "M", label: "SKUs" },
        { value: 10, suffix: "", label: "países" },
        { value: 500, suffix: "M", label: "eventos / año" },
      ],
      cta: "Solicitar acceso",
    },
    claim: {
      before: "Otros integran software.",
      after: "CORE integra operaciones.",
    },
    glosario: glosario_es,
  },

  pt: {
    nav: { cta: "Solicitar acesso" },
    hero: {
      tagline: "The Operating System for Commerce",
      sub: "Conectando Marcas, Operações e Mercados.",
      scroll: "Explorar",
    },
    fragmentation: {
      opening: "Você já tem o software.",
      problem_a: "O problema não é o software.",
      problem_b: "O problema é a fragmentação.",
      systems: ["CRM", "ERP", "Marketplace", "Warehouse", "Logística", "Alfândega", "BI", "Pagamentos", "Documentos"],
    },
    cost: {
      title: "O custo de operar fragmentado",
      items: ["Clientes duplicados", "Estoque duplicado", "Processos duplicados", "Trabalho manual constante", "Decisões sem visibilidade", "Múltiplas versões da verdade"],
      quote: "As empresas passam anos integrando ferramentas que nunca foram projetadas para trabalhar juntas.",
    },
    whatif: {
      question: "E se tudo começasse conectado?",
      sub: "Uma única fonte de verdade. Não mais uma integração. Um ponto de partida diferente.",
      primitives: ["Entidade", "Produto", "Operação", "Relacionamento", "Documento", "Evento"],
    },
    foundation: {
      label: "CORE Foundation",
      title: "O núcleo operacional",
      sub: "Não é um banco de dados. É a verdade operacional.",
      nodes: ["Entidades", "Marcas", "Produtos", "Clientes", "Documentos", "Operações", "Estoque", "Eventos"],
    },
    ecosystem: {
      label: "O ecossistema CORE",
      title: "Capacidades, não módulos.",
      sub: "Tudo compartilha a mesma fundação operacional.",
      capabilities: [
        { id: "rep", name: "CORE Rep", desc: "Sua força comercial conectada a cada produto, preço e cliente em tempo real." },
        { id: "logistics", name: "CORE Logistics", desc: "Rede territorial de movimento. Rotas, warehouses e nós operacionais." },
        { id: "directshipment", name: "CORE DirectShipment", desc: "Comércio direto. Origem ao destino com fricção mínima." },
        { id: "market", name: "CORE Market", desc: "Rede comercial. Acesso a mercados, canais e relações de negócio." },
        { id: "finance", name: "CORE Finance", desc: "Fluxos de capital. Liquidez e financiamento operacional." },
        { id: "intelligence", name: "CORE Intelligence", desc: "Padrões e insights que emergem da sua operação completa." },
      ],
    },
    paraguay: {
      label: "Caso real · Paraguai → Uruguai",
      title: "Opere em um novo país sem construir uma nova operação.",
      before_label: "Sem CORE",
      after_label: "Com CORE",
      before: ["Estrutura legal", "Buscar logística", "Buscar warehouse", "Integrar software", "Gerenciar alfândega", "Gerenciar estoque", "Gerenciar entregas"],
      after: ["Produtos entram", "Zona Franca", "Estoque", "Distribuição", "Market", "Última Milha", "Cliente ✓"],
    },
    cardisan: {
      label: "Caso real · Cardisan · LATAM",
      title: "Expanda seu mercado, não sua complexidade.",
      desc: "Carnes premium, embutidos e produtos gourmet. Um ecossistema operacional para toda a América Latina.",
    },
    difference: {
      label: "Por que CORE é diferente",
      before_label: "Modelo tradicional",
      after_label: "Modelo CORE",
      before: ["Muitos sistemas", "Muitos provedores", "Muitas integrações", "Muitas verdades"],
      after: ["Uma entidade", "Um produto", "Uma operação", "Uma verdade"],
    },
    global: {
      label: "Alcance global",
      title: "Nascido na América do Sul.\nNão limitado à América do Sul.",
      sub: "CORE se torna o gateway operacional entre marcas globais e mercados regionais.",
      regions: ["Europa", "Ásia", "América do Norte"],
    },
    vision: {
      label: "Visão 2035",
      title: "Infraestrutura, não software.",
      stats: [
        { value: 50000, suffix: "", label: "empresas" },
        { value: 2, suffix: "M", label: "SKUs" },
        { value: 10, suffix: "", label: "países" },
        { value: 500, suffix: "M", label: "eventos / ano" },
      ],
      cta: "Solicitar acesso",
    },
    claim: {
      before: "Outros integram software.",
      after: "CORE integra operações.",
    },
    glosario: glosario_pt,
  },

  en: {
    nav: { cta: "Request access" },
    hero: {
      tagline: "The Operating System for Commerce",
      sub: "Connecting Brands, Operations and Markets.",
      scroll: "Explore",
    },
    fragmentation: {
      opening: "You already have the software.",
      problem_a: "The problem is not the software.",
      problem_b: "The problem is fragmentation.",
      systems: ["CRM", "ERP", "Marketplace", "Warehouse", "Logistics", "Customs", "BI", "Payments", "Documents"],
    },
    cost: {
      title: "The cost of fragmented operations",
      items: ["Duplicate customers", "Duplicate inventory", "Duplicate processes", "Constant manual work", "Decisions without visibility", "Multiple versions of the truth"],
      quote: "Companies spend years integrating tools that were never designed to work together.",
    },
    whatif: {
      question: "What if everything started connected?",
      sub: "A single source of truth. Not another integration. A different starting point.",
      primitives: ["Entity", "Product", "Operation", "Relationship", "Document", "Event"],
    },
    foundation: {
      label: "CORE Foundation",
      title: "The operational nucleus",
      sub: "This is not a database. This is operational truth.",
      nodes: ["Entities", "Brands", "Products", "Customers", "Documents", "Operations", "Inventory", "Events"],
    },
    ecosystem: {
      label: "The CORE ecosystem",
      title: "Capabilities, not modules.",
      sub: "Everything shares the same operational foundation.",
      capabilities: [
        { id: "rep", name: "CORE Rep", desc: "Your commercial force connected to every product, price and customer in real time." },
        { id: "logistics", name: "CORE Logistics", desc: "Territorial movement network. Routes, warehouses and operational nodes." },
        { id: "directshipment", name: "CORE DirectShipment", desc: "Direct commerce. Origin to destination with minimal friction." },
        { id: "market", name: "CORE Market", desc: "Commercial network. Access to markets, channels and business relationships." },
        { id: "finance", name: "CORE Finance", desc: "Capital flows. Liquidity and operational financing." },
        { id: "intelligence", name: "CORE Intelligence", desc: "Patterns and insights that emerge from your complete operation." },
      ],
    },
    paraguay: {
      label: "Real case · Paraguay → Uruguay",
      title: "Operate in a new country without building a new operation.",
      before_label: "Without CORE",
      after_label: "With CORE",
      before: ["Legal structure", "Find logistics", "Find warehouse", "Integrate software", "Manage customs", "Manage inventory", "Manage delivery"],
      after: ["Products enter", "Free Zone", "Inventory", "Distribution", "Market", "Last Mile", "Customer ✓"],
    },
    cardisan: {
      label: "Real case · Cardisan · LATAM",
      title: "Expand your market, not your complexity.",
      desc: "Premium meats, cured products and gourmet goods. One operational ecosystem for all of Latin America.",
    },
    difference: {
      label: "Why CORE is different",
      before_label: "Traditional model",
      after_label: "CORE model",
      before: ["Many systems", "Many providers", "Many integrations", "Many truths"],
      after: ["One entity", "One product", "One operation", "One truth"],
    },
    global: {
      label: "Global reach",
      title: "Born in South America.\nNot limited to South America.",
      sub: "CORE becomes the operational gateway between global brands and regional markets.",
      regions: ["Europe", "Asia", "North America"],
    },
    vision: {
      label: "Vision 2035",
      title: "Infrastructure, not software.",
      stats: [
        { value: 50000, suffix: "", label: "companies" },
        { value: 2, suffix: "M", label: "SKUs" },
        { value: 10, suffix: "", label: "countries" },
        { value: 500, suffix: "M", label: "events / year" },
      ],
      cta: "Request access",
    },
    claim: {
      before: "Others integrate software.",
      after: "CORE integrates operations.",
    },
    glosario: glosario_en,
  },
} as const;

export type Translations = typeof translations.es;




