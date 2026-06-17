// Re-exporta las pasarelas por defecto para que los consumidores
// puedan extender la lista sin importar el módulo completo.
//
// Uso:
//   import { DEFAULT_GATEWAYS } from '@core/commerce/adapters/gateways';
//   import type { PaymentAdapter } from '@core/commerce';
//
//   const stripeAdapter: PaymentAdapter = { ... };
//   <CarritoModule gateways={[...DEFAULT_GATEWAYS, stripeAdapter]} />

export { DEFAULT_GATEWAYS } from '../CarritoModule';

