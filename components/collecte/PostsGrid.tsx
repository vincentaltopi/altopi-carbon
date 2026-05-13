'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ImportWizard } from './ImportWizard'

type PostRow = {
  id: string
  order_index: number
  name: string
  scope: string
  category: string | null
  activity_count: number
  total_co2e: number
}

const SCOPE_CONFIG = {
  '1': { label: 'Scope 1', shortLabel: 'S1', badge: 'bg-red-100 text-red-700', dot: 'bg-red-400', filterBg: 'bg-red-500' },
  '2': { label: 'Scope 2', shortLabel: 'S2', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', filterBg: 'bg-amber-500' },
  '3': { label: 'Scope 3', shortLabel: 'S3', badge: 'bg-primary-100 text-primary-700', dot: 'bg-primary-400', filterBg: 'bg-primary-600' },
}

type ScopeFilter = 'all' | '1' | '2' | '3'

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: n < 1 ? 3 : 1, maximumFractionDigits: n < 1 ? 3 : 1 })
}

export function PostsGrid({ posts }: { posts: PostRow[] }) {
  const [filter, setFilter] = useState<ScopeFilter>('all')
  const [showImport, setShowImport] = useState(false)

  const filtered = filter === 'all' ? posts : posts.filter(p => p.scope === filter)

  const totalCo2e = posts.reduce((s, p) => s + p.total_co2e, 0)
  const activeCount = posts.filter(p => p.activity_count > 0).length
  const pct = posts.length > 0 ? Math.round((activeCount / posts.length) * 100) : 0
  const totalEntries = posts.reduce((s, p) => s + p.activity_count, 0)

  const scopeCounts: Record<string, { active: number; total: number; co2e: number }> = { '1': { active: 0, total: 0, co2e: 0 }, '2': { active: 0, total: 0, co2e: 0 }, '3': { active: 0, total: 0, co2e: 0 } }
  posts.forEach(p => {
    const sc = scopeCounts[p.scope]
    if (sc) {
      sc.total++
      if (p.activity_count > 0) sc.active++
      sc.co2e += p.total_co2e
    }
  })

  return (
    <>
      {/* Stats bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-5 mb-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-700">Progression globale</span>
              <span className="text-xs font-bold text-primary-700">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{activeCount}/{posts.length}</p>
            <p className="text-[10px] text-gray-400">postes actifs</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{totalEntries}</p>
            <p className="text-[10px] text-gray-400">données saisies</p>
          </div>
          {totalCo2e > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-primary-700">{fmt(totalCo2e)}</p>
              <p className="text-[10px] text-gray-400">tCO₂e total</p>
            </div>
          )}
        </div>

        {/* Scope mini-bars */}
        <div className="grid grid-cols-3 gap-2">
          {(['1', '2', '3'] as const).map(scope => {
            const cfg = SCOPE_CONFIG[scope]
            const sc = scopeCounts[scope]
            return (
              <div key={scope} className="flex items-center gap-2 text-[10px] text-gray-500">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <span className="font-medium">{cfg.label}</span>
                <span className="ml-auto text-gray-400">{sc.active}/{sc.total}</span>
                {sc.co2e > 0 && <span className="font-semibold text-gray-700">{fmt(sc.co2e)}t</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter + Import */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tous ({posts.length})
          </button>
          {(['1', '2', '3'] as const).map(scope => {
            const cfg = SCOPE_CONFIG[scope]
            return (
              <button
                key={scope}
                onClick={() => setFilter(scope)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === scope ? `bg-white shadow-sm text-gray-900` : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cfg.shortLabel} ({scopeCounts[scope].total})
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Import IA
        </button>
      </div>

      {/* Posts table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">N°</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">Scope</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Poste d&apos;émission</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Données</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">CO₂e</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Statut</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(post => {
              const cfg = SCOPE_CONFIG[post.scope as '1' | '2' | '3'] ?? SCOPE_CONFIG['3']
              const isActive = post.activity_count > 0

              return (
                <tr key={post.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-gray-400 tabular-nums">{post.order_index}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.shortLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-semibold text-gray-900">{post.name}</p>
                    {post.category && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{post.category}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <span className={`text-xs tabular-nums ${isActive ? 'font-semibold text-gray-700' : 'text-gray-300'}`}>
                      {post.activity_count > 0 ? post.activity_count : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-xs font-bold tabular-nums ${post.total_co2e > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                      {post.total_co2e > 0 ? `${fmt(post.total_co2e)} t` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center hidden md:table-cell">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                      {isActive ? 'Actif' : 'Vide'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/collecte/saisie?post=${post.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isActive ? 'Ajouter →' : 'Saisir →'}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="px-6 py-8 text-center text-xs text-gray-400">
            Aucun poste pour ce scope.
          </div>
        )}
      </div>

      {showImport && <ImportWizard onClose={() => setShowImport(false)} />}
    </>
  )
}
