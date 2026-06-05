export type Locale = "es" | "pt" | "en";

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
      before: ["Many systems", "Many providers", "Many integrations", "Many truths"],
      after: ["One entity", "One product", "One operation", "One truth"],
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
      before: "Others integrate software.",
      after: "CORE integrates operations.",
    },
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
      before: ["Many systems", "Many providers", "Many integrations", "Many truths"],
      after: ["One entity", "One product", "One operation", "One truth"],
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
      before: "Others integrate software.",
      after: "CORE integrates operations.",
    },
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
  },
} as const;

export type Translations = typeof translations.es;
