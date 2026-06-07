interface PageHeaderProps {
  tag: string
  tagColor: string
  tagBg: string
  title: string
  subtitle: string
}

export default function PageHeader({ tag, tagColor, tagBg, title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8 animate-in">
      <span
        className="inline-block font-mono text-[10px] tracking-[0.16em] uppercase px-2.5 py-1 rounded mb-4"
        style={{ background: tagBg, color: tagColor, border: `1px solid ${tagColor}33` }}
      >
        {tag}
      </span>
      <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: '#E8EDF5' }}>
        {title}
      </h1>
      <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'rgba(232,237,245,0.5)' }}>
        {subtitle}
      </p>
      <div className="gold-rule mt-6" />
    </div>
  )
}

