// ═══════════════════════════════════════════════════════════
// @core/design — Entry Point
// ═══════════════════════════════════════════════════════════

export { tokens } from './tokens';
export { defaultTheme } from './themes/default';
export { secondHandTheme } from './themes/second-hand';

export type { Tokens } from './tokens';
export type { DefaultTheme } from './themes/default';
export type { SecondHandTheme } from './themes/second-hand';

// CSS Variables helper
export const toCSSVars = (theme: Record<string, any>, prefix = '--core'): string => {
  const vars: string[] = [];
  const flatten = (obj: Record<string, any>, path: string) => {
    for (const [key, value] of Object.entries(obj)) {
      const varName = `${path}-${key}`;
      if (typeof value === 'string' || typeof value === 'number') {
        vars.push(`${varName}: ${value};`);
      } else if (typeof value === 'object') {
        flatten(value, varName);
      }
    }
  };
  flatten(theme.colors, `${prefix}-color`);
  return `:root {\n  ${vars.join('\n  ')}\n}`;
};

