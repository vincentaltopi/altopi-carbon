import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
