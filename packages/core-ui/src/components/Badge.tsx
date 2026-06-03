import { tokens } from '@core/design';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'secondhand';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const badgeColors: Record<BadgeVariant, { bg: string; color: string }> = {
  default:    { bg: tokens.colors.bluePale,       color: tokens.colors.blue },
  success:    { bg: tokens.colors.greenLight,      color: tokens.colors.green },
  warning:    { bg: tokens.colors.amberLight,      color: tokens.colors.amber },
  danger:     { bg: tokens.colors.redLight,        color: tokens.colors.red },
  secondhand: { bg: tokens.colors.sh.background,   color: tokens.colors.sh.primary },
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => (
  <span style={{
    display:      'inline-flex',
    alignItems:   'center',
    padding:      `2px ${tokens.spacing[2]}`,
    borderRadius: tokens.radius.pill,
    fontSize:     tokens.typography.size.xs,
    fontWeight:   tokens.typography.weight.bold,
    letterSpacing:tokens.typography.letterSpacing.wide,
    textTransform:'uppercase',
    fontFamily:   tokens.typography.family.base,
    background:   badgeColors[variant].bg,
    color:        badgeColors[variant].color,
  }}>
    {children}
  </span>
);
