import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'

const SCOPE_CONFIG = {
  '1': { label: 'Scope 1', desc: 'Émissions directes', color: '#ef4444', bar: 'bg-red-400', badge: 'bg-red-50 text-red-700', text: 'text-red-500' },
  '2': { label: 'Scope 2', desc: 'Énergie indirecte', color: '#f59e0b', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700', text: 'text-amber-500' },
  '3': { label: 'Scope 3', desc: 'Émissions indirectes', color: '#22c55e', bar: 'bg-primary-500', badge: 'bg-primary-50 text-primary-700', text: 'text-primary-500' },
}

function fmt(val: number, decimals = 1) {
  return val.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default async function ResultatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  const orgId = membership?.organization_id ?? null

  if (!orgId) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Résultats & scopes" subtitle="Aucune organisation" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Aucune organisation associée à votre compte.</p>
        </div>
      </div>
    )
  }

  const { data: study } = await supabase
    .from('studies')
    .select('id, reference_year, name, status')
    .eq('organization_id', orgId)
    .order('reference_year', { ascending: false })
    .limit(1)
    .single()

  const studyId = study?.id ?? null
  const studyYear = study?.reference_year ?? new Date().getFullYear()

  type ActivityRow = {
    id: string
    co2e_calculated: number | null
    emission_post_id: string
    emission_posts: {
      name: string
      scope: string
      order_index: number
    } | null
  }

  let activities: ActivityRow[] = []

  if (studyId) {
    const { data } = await supabase
      .from('activity_data')
      .select('id, co2e_calculated, emission_post_id, emission_posts(name, scope, order_index)')
      .eq('study_id', studyId)

    activities = (data ?? []) as unknown as ActivityRow[]
  }

  const totalCo2eKg = activities.reduce((s, a) => s + (a.co2e_calculated ?? 0), 0)
  const totalCo2e = totalCo2eKg / 1000

  const isEmpty = totalCo2e === 0

  // Per-scope aggregation
  type ScopeTotals = Record<string, number>
  const scopeTotals: ScopeTotals = { '1': 0, '2': 0, '3': 0 }
  activities.forEach(a => {
    const scope = a.emission_posts?.scope ?? '3'
    scopeTotals[scope] = (scopeTotals[scope] ?? 0) + (a.co2e_calculated ?? 0) / 1000
  })

  // Per-post aggregation
  type PostAgg = { name: string; scope: string; order_index: number; co2e: number; count: number }
  const postAgg: Record<string, PostAgg> = {}
  activities.forEach(a => {
    const postId = a.emission_post_id
    if (!postAgg[postId]) {
      postAgg[postId] = {
        name: a.emission_posts?.name ?? 'Poste inconnu',
        scope: a.emission_posts?.scope ?? '3',
        order_index: a.emission_posts?.order_index ?? 99,
        co2e: 0,
        count: 0,
      }
    }
    postAgg[postId].co2e += (a.co2e_calculated ?? 0) / 1000
    postAgg[postId].count++
  })

  const postsSorted = Object.values(postAgg)
    .filter(p => p.co2e > 0)
    .sort((a, b) => b.co2e - a.co2e)

  const topMax = postsSorted[0]?.co2e ?? 1

  const scopePcts: Record<string, number> = {}
  Object.entries(scopeTotals).forEach(([scope, val]) => {
    scopePcts[scope] = totalCo2e > 0 ? Math.round((val / totalCo2e) * 100) : 0
  })

  if (isEmpty) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Résultats & scopes" subtitle={`Bilan ${studyYear} · Aucune donnée`}>
          <Link
            href="/collecte/saisie"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition"
          >
            + Saisir des données
          </Link>
        </TopBar>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">Aucun résultat disponible</h3>
            <p className="text-sm text-gray-500 mb-6">
              Les résultats s&apos;afficheront dès que vous aurez saisi vos premières données d&apos;activité.
            </p>
            <Link
              href="/collecte"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2.5 rounded-xl transition"
            >
              Commencer la collecte →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Résultats & scopes" subtitle={`Bilan ${studyYear} · ${activities.length} données`}>
        <Link href="/exports" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 px-3.5 py-2 rounded-lg transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Exporter
        </Link>
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 animate-fade-in">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-900 rounded-2xl p-4 text-white col-span-2 lg:col-span-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Total {studyYear}</p>
              <p className="text-3xl font-bold text-primary-400">{fmt(totalCo2e)}</p>
              <p className="text-xs text-gray-500 mt-1">tCO₂e</p>
            </div>
            {(['1', '2', '3'] as const).map(scope => {
              const cfg = SCOPE_CONFIG[scope]
              const val = scopeTotals[scope] ?? 0
              const pct = scopePcts[scope] ?? 0
              return (
                <div key={scope} className="bg-white rounded-2xl p-4 border border-gray-200">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">{cfg.label}</p>
                  <p className={`text-2xl font-bold ${cfg.text}`}>{fmt(val)}</p>
                  <p className="text-xs text-gray-400 mt-1">tCO₂e · {pct}%</p>
                </div>
              )
            })}
          </div>

          {/* Répartition visuelle */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Répartition par scope</p>
            <div className="flex h-4 rounded-full overflow-hidden gap-px mb-4">
              {(['1', '2', '3'] as const).map(scope => {
                const pct = scopePcts[scope]
                if (!pct) return null
                const cfg = SCOPE_CONFIG[scope]
                return (
                  <div
                    key={scope}
                    className={`${cfg.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${cfg.label} · ${pct}%`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {(['1', '2', '3'] as const).map(scope => {
                const cfg = SCOPE_CONFIG[scope]
                const pct = scopePcts[scope]
                const val = scopeTotals[scope] ?? 0
                return (
                  <div key={scope} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.bar}`} />
                    <span className="text-xs text-gray-600">{cfg.label} · {cfg.desc}</span>
                    <span className="text-xs font-bold text-gray-900">{fmt(val)} tCO₂e</span>
                    <span className="text-xs text-gray-400">({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Détail par poste */}
          {postsSorted.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Détail par poste émetteur</p>
                <span className="text-[10px] text-gray-400">{postsSorted.length} poste{postsSorted.length > 1 ? 's' : ''} actif{postsSorted.length > 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {postsSorted.map(p => {
                  const cfg = SCOPE_CONFIG[p.scope as '1' | '2' | '3'] ?? SCOPE_CONFIG['3']
                  const pct = totalCo2e > 0 ? Math.round((p.co2e / totalCo2e) * 100) : 0
                  const barW = topMax > 0 ? (p.co2e / topMax) * 100 : 0
                  return (
                    <div key={`${p.name}-${p.scope}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.count} donnée{p.count > 1 ? 's' : ''}</p>
                      </div>
                      <div className="w-28 hidden sm:flex items-center gap-2 flex-shrink-0">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cfg.bar}`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900 text-right w-28 flex-shrink-0 tabular-nums">
                        {fmt(p.co2e, 3)} tCO₂e
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Total row */}
              <div className="flex items-center gap-4 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 flex-shrink-0">TOTAL</span>
                <span className="flex-1 text-xs font-bold text-gray-900">Toutes émissions confondues</span>
                <span className="text-xs font-bold text-gray-900 text-right w-28 flex-shrink-0 tabular-nums">
                  {fmt(totalCo2e, 3)} tCO₂e
                </span>
              </div>
            </div>
          )}

          {/* Scope progress */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['1', '2', '3'] as const).map(scope => {
              const cfg = SCOPE_CONFIG[scope]
              const val = scopeTotals[scope] ?? 0
              const pct = scopePcts[scope] ?? 0
              const postsInScope = postsSorted.filter(p => p.scope === scope)
              return (
                <div key={scope} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${cfg.bar}`} />
                    <p className="text-xs font-bold text-gray-800">{cfg.label}</p>
                    <p className="text-[10px] text-gray-400">· {cfg.desc}</p>
                  </div>
                  <p className={`text-xl font-bold ${cfg.text} mb-0.5`}>{fmt(val)} tCO₂e</p>
                  <p className="text-[10px] text-gray-400 mb-3">{pct}% du total · {postsInScope.length} poste{postsInScope.length !== 1 ? 's' : ''}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
