import { tokens } from '@core/design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'secondhand';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  loading?: boolean;
  icon?:    React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background:  tokens.colors.blue,
    color:       tokens.colors.white,
    border:      'none',
  },
  secondary: {
    background:  'transparent',
    color:       tokens.colors.blue,
    border:      `1px solid ${tokens.colors.blue}`,
  },
  ghost: {
    background:  'rgba(255,255,255,.12)',
    color:       tokens.colors.white,
    border:      '1px solid rgba(255,255,255,.25)',
  },
  danger: {
    background:  tokens.colors.red,
    color:       tokens.colors.white,
    border:      'none',
  },
  secondhand: {
    background:  tokens.colors.sh.primary,
    color:       tokens.colors.white,
    border:      'none',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: tokens.components.button.heightSm, fontSize: tokens.typography.size.xs,  padding: `0 ${tokens.spacing[3]}` },
  md: { height: tokens.components.button.height,   fontSize: tokens.typography.size.sm,  padding: `0 ${tokens.spacing[4]}` },
  lg: { height: tokens.components.button.heightLg, fontSize: tokens.typography.size.base,padding: `0 ${tokens.spacing[6]}` },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, style, ...props
}) => (
  <button
    style={{
      display:        'inline-flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            tokens.spacing[2],
      minWidth:       tokens.components.button.minWidth,
      fontFamily:     tokens.typography.family.base,
      fontWeight:     tokens.components.button.fontWeight,
      letterSpacing:  tokens.components.button.letterSpacing,
      textTransform:  'uppercase',
      borderRadius:   tokens.components.button.radius,
      cursor:         props.disabled ? 'not-allowed' : 'pointer',
      opacity:        props.disabled || loading ? 0.5 : 1,
      transition:     tokens.components.button.transition,
      boxSizing:      'border-box',
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    }}
    {...props}
  >
    {icon && <span>{icon}</span>}
    {loading ? '...' : children}
  </button>
);

