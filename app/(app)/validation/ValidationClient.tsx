'use client'

import { useState, useTransition } from 'react'
import { approveActivityData, rejectActivityData } from './actions'

export type ActivityItem = {
  id: string
  emission_post_id: string
  description: string | null
  quantity: number | null
  unit: string | null
  co2e_calculated: number | null
  source: string | null
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
  emission_posts: { name: string | null; scope: string | null } | null
}

interface Props {
  items: ActivityItem[]
  isAdmin: boolean
}

const scopeColors: Record<string, string> = {
  '1': 'bg-red-100 text-red-700',
  '2': 'bg-yellow-100 text-yellow-700',
  '3': 'bg-blue-100 text-blue-700',
}

export default function ValidationClient({ items, isAdmin }: Props) {
  const [list, setList] = useState<ActivityItem[]>(items)
  const [processing, setProcessing] = useState<string[]>([])
  const [, startTransition] = useTransition()

  const handleApprove = (id: string) => {
    setProcessing(prev => [...prev, id])
    startTransition(async () => {
      await approveActivityData(id)
      setList(prev => prev.filter(item => item.id !== id))
      setProcessing(prev => prev.filter(x => x !== id))
    })
  }

  const handleReject = (id: string) => {
    setProcessing(prev => [...prev, id])
    startTransition(async () => {
      await rejectActivityData(id)
      setList(prev => prev.filter(item => item.id !== id))
      setProcessing(prev => prev.filter(x => x !== id))
    })
  }

  const handleApproveAll = () => {
    list.forEach(item => handleApprove(item.id))
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold">Tout est validé</p>
        <p className="text-gray-400 text-sm mt-1">Aucune donnée en attente de validation.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isAdmin && list.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={handleApproveAll}
            className="text-sm font-medium bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Tout approuver ({list.length})
          </button>
        </div>
      )}

      {list.map(item => {
        const busy = processing.includes(item.id)
        const scope = item.emission_posts?.scope ?? '3'
        const postName = item.emission_posts?.name ?? 'Poste inconnu'
        const contributor = item.profiles?.full_name || item.profiles?.email || 'Inconnu'
        const co2Display = item.co2e_calculated ? `${(item.co2e_calculated / 1000).toFixed(3)} tCO₂e` : 'Non calculé'
        const isEmailImport = item.source === 'n8n_email'
        const date = new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

        return (
          <div
            key={item.id}
            className={`bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center transition-opacity ${busy ? 'opacity-50' : ''}`}
          >
            {/* Left: info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scopeColors[scope] ?? 'bg-gray-100 text-gray-600'}`}>
                  S{scope}
                </span>
                <p className="text-sm font-semibold text-gray-800 truncate">{postName}</p>
                {isEmailImport && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 ml-auto flex-shrink-0">
                    EMAIL AUTO
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-600 mb-2">{item.description || '—'}</p>

              <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                <span>
                  <strong className="text-gray-700">{item.quantity?.toLocaleString('fr-FR') ?? '—'}</strong> {item.unit}
                </span>
                <span className="text-emerald-700 font-medium">{co2Display}</span>
                <span>Par {contributor}</span>
                <span>{date}</span>
              </div>
            </div>

            {/* Right: actions */}
            {isAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleReject(item.id)}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rejeter
                </button>
                <button
                  onClick={() => handleApprove(item.id)}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approuver
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
