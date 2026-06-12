// @core/carrito — Public API
export { default } from './CarritoModule';
export { default as CarritoModule } from './CarritoModule';

export type {
  CarritoItem,
  CarritoModuleProps,
  CheckoutData,
  PaymentAdapter,
  PaymentGateway,
  PaymentResult,
} from './CarritoModule';

// Adapters
export { DEFAULT_GATEWAYS } from './adapters/gateways';
