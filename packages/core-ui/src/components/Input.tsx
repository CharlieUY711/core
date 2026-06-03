import { tokens } from '@core/design';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:  string;
  error?:  string;
  dark?:   boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, dark, style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
    {label && (
      <label style={{
        fontSize:   tokens.typography.size.sm,
        fontWeight: tokens.typography.weight.medium,
        color:      dark ? tokens.colors.white : tokens.colors.navy,
        fontFamily: tokens.typography.family.base,
      }}>
        {label}
      </label>
    )}
    <input
      style={{
        height:       tokens.components.input.height,
        background:   dark ? tokens.components.input.bg : tokens.colors.white,
        border:       dark ? 'none' : `1px solid ${error ? tokens.colors.red : tokens.colors.grayBorder}`,
        borderRadius: tokens.components.input.radius,
        padding:      `0 ${tokens.spacing[3]}`,
        fontSize:     tokens.components.input.fontSize,
        color:        dark ? tokens.colors.white : tokens.colors.navy,
        fontFamily:   tokens.typography.family.base,
        outline:      'none',
        boxSizing:    'border-box',
        width:        '100%',
        ...style,
      }}
      {...props}
    />
    {error && (
      <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.red }}>
        {error}
      </span>
    )}
  </div>
);
