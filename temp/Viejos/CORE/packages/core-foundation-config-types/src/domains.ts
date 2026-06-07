export type DocumentConfig = any;
export type DesignConfig = any;
export type GlobeConfig = any;
export type I18nConfig = any;
export type EmailsConfig = any;
export type NotificationsConfig = any;
export type FeatureFlagsConfig = any;
export type BrandingConfig = any;
export type UIConfig = any;
export type AuthConfig = any;
export type IntegrationsConfig = any;

export type ResolvedConfig<T> = {
  global: T;
  tenants: Record<string, {
    brands: Record<string, {
      environments: Record<string, T>;
    }>;
  }>;
};


