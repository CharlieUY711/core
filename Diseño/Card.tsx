import { tokens } from '@core/design';

interface CardProps {
  children:  React.ReactNode;
  padding?:  keyof typeof tokens.spacing;
  shadow?:   boolean;
  style?:    React.CSSProperties;
  onClick?:  () => void;
}

export const Card: React.FC<CardProps> = ({
  children, padding = '4', shadow = true, style, onClick
}) => (
  <div
    onClick={onClick}
    style={{
      background:   tokens.components.card.bg,
      border:       `1px solid ${tokens.components.card.border}`,
      borderRadius: tokens.components.card.radius,
      boxShadow:    shadow ? tokens.components.card.shadow : 'none',
      padding:      tokens.spacing[padding as keyof typeof tokens.spacing],
      cursor:       onClick ? 'pointer' : 'default',
      boxSizing:    'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);
