'use client'
import { useState } from 'react'

interface DocCardProps {
  number?: string
  title: string
  description: string
  badge?: string
  badgeColor?: string
  items?: string[]
  downloadLabel?: string
  downloadHref?: string
  content?: React.ReactNode
}

export default function DocCard({
  number,
  title,
  description,
  badge,
  badgeColor = '#C9A84C',
  items,
  downloadLabel,
  downloadHref,
  content,
}: DocCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${expanded ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          {number && (
            <span
              className="font-mono text-xl font-medium leading-none mt-0.5"
              style={{ color: 'rgba(201,168,76,0.35)' }}
            >
              {number}
            </span>
          )}
          <div>
            <h3 className="font-medium text-sm" style={{ color: '#E8EDF5' }}>
              {title}
            </h3>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(232,237,245,0.45)' }}>
              {description}
            </p>
          </div>
        </div>
        {badge && (
          <span
            className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded flex-shrink-0"
            style={{
              background: `${badgeColor}18`,
              color: badgeColor,
              border: `1px solid ${badgeColor}33`,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {items && items.length > 0 && (
        <ul className="mt-3 space-y-1 pl-2 border-l" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          {items.map((item) => (
            <li key={item} className="text-xs" style={{ color: 'rgba(232,237,245,0.4)' }}>
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* Expanded content */}
      {expanded && content && (
        <div
          className="mt-5 pt-5 rounded-lg"
          style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}
        >
          {content}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        {content && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: expanded ? 'rgba(201,168,76,0.9)' : 'rgba(201,168,76,0.6)' }}
          >
            <svg
              className="w-3 h-3 transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Cerrar' : 'Ver online'}
          </button>
        )}

        {downloadLabel && downloadHref && (
          <a
            href={downloadHref}
            download
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: 'rgba(201,168,76,0.6)' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloadLabel}
          </a>
        )}

        {downloadLabel && !downloadHref && (
          <button
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: 'rgba(201,168,76,0.6)' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloadLabel}
          </button>
        )}
      </div>
    </div>
  )
}

