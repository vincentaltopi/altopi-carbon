import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'

const SCOPE_CONFIG = {
  '1': { label: 'Scope 1 — Direct', color: '#ef4444', bg: 'bg-red-400', badge: 'bg-red-50 text-red-600', dot: '#ef4444' },
  '2': { label: 'Scope 2 — Énergie', color: '#f59e0b', bg: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600', dot: '#f59e0b' },
  '3': { label: 'Scope 3 — Indirect', color: '#22c55e', bg: 'bg-primary-500', badge: 'bg-primary-50 text-primary-600', dot: '#22c55e' },
} as const

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(name, sector)')
    .eq('user_id', user!.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgs = membership?.organizations as any
  const orgName: string = (Array.isArray(orgs) ? orgs[0]?.name : orgs?.name) ?? 'votre organisation'
  const orgId = membership?.organization_id

  // Get current study
  const { data: study } = orgId
    ? await supabase.from('studies').select('id, reference_year').eq('organization_id', orgId).order('reference_year', { ascending: false }).limit(1).single()
    : { data: null }

  // Get all emission posts
  const { data: allPosts, count: totalPosts } = await supabase
    .from('emission_posts')
    .select('id, scope, name, order_index', { count: 'exact' })
    .order('scope').order('order_index')

  // Get activity data with post info
  const { data: rawActivities } = study
    ? await supabase
        .from('activity_data')
        .select('id, emission_post_id, co2e_calculated, description, created_at, unit, quantity, emission_posts(name, scope, order_index)')
        .eq('study_id', study.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const activities = rawActivities ?? []
  const posts = allPosts ?? []
  const studyYear = study?.reference_year ?? new Date().getFullYear()

  // ── Compute stats ───────────────────────────────────────────────────────
  const totalCo2eKg = activities.reduce((s, a) => s + (a.co2e_calculated ?? 0), 0)
  const totalCo2eTonne = totalCo2eKg / 1000

  const scopeTotals: Record<string, number> = { '1': 0, '2': 0, '3': 0 }
  activities.forEach(a => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scope = String((a.emission_posts as any)?.scope ?? '')
    if (scope in scopeTotals) scopeTotals[scope] += (a.co2e_calculated ?? 0) / 1000
  })

  const postsWithData = new Set(activities.map(a => a.emission_post_id))
  const completionPct = (totalPosts ?? 0) > 0 ? Math.round((postsWithData.size / (totalPosts ?? 1)) * 100) : 0
  const pendingCount = (totalPosts ?? 0) - postsWithData.size

  // Top 5 emitters by emission post
  const emitterMap: Record<string, { name: string; co2e: number; scope: string }> = {}
  activities.forEach(a => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ep = a.emission_posts as any
    if (!ep) return
    const pid = a.emission_post_id
    if (!emitterMap[pid]) emitterMap[pid] = { name: ep.name, co2e: 0, scope: String(ep.scope) }
    emitterMap[pid].co2e += (a.co2e_calculated ?? 0) / 1000
  })
  const topEmitters = Object.values(emitterMap).sort((a, b) => b.co2e - a.co2e).slice(0, 5)
  const maxEmitter = topEmitters[0]?.co2e ?? 1

  // Scope breakdown for bar
  const scope1Pct = totalCo2eTonne > 0 ? Math.round((scopeTotals['1'] / totalCo2eTonne) * 100) : 0
  const scope2Pct = totalCo2eTonne > 0 ? Math.round((scopeTotals['2'] / totalCo2eTonne) * 100) : 0
  const scope3Pct = totalCo2eTonne > 0 ? 100 - scope1Pct - scope2Pct : 0

  const hasData = totalCo2eTonne > 0
  const recentEntries = activities.slice(0, 5)

  // Scope completions for modules
  const scopePostCounts = { '1': 0, '2': 0, '3': 0 } as Record<string, number>
  const scopePostWithData = { '1': 0, '2': 0, '3': 0 } as Record<string, number>
  posts.forEach(p => {
    const s = String(p.scope)
    if (s in scopePostCounts) scopePostCounts[s]++
    if (postsWithData.has(p.id)) scopePostWithData[s]++
  })

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Tableau de bord" subtitle={`Bilan Carbone ${studyYear} · ${orgName}`}>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {pendingCount} poste{pendingCount > 1 ? 's' : ''} incomplet{pendingCount > 1 ? 's' : ''}
          </span>
        )}
        <Link href="/collecte/saisie" className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition">
          + Ajouter une donnée
        </Link>
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 animate-fade-in">

          {!hasData ? (
            /* ── EMPTY STATE ──────────────────────────────────────────── */
            <>
              {/* Welcome banner */}
              <div className="bg-gray-900 rounded-2xl p-8 text-white flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-2">Votre bilan carbone {studyYear} vous attend</h2>
                <p className="text-sm text-gray-400 max-w-sm mb-6">
                  Commencez à saisir vos données d&apos;activité pour voir vos émissions calculées en temps réel, poste par poste.
                </p>
                <Link
                  href="/collecte/saisie"
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
                >
                  Commencer la collecte →
                </Link>
              </div>

              {/* 3 scopes guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { scope: '1', label: 'Scope 1 — Direct', desc: 'Combustion fixe & mobile, procédés, fuites réfrigérants', count: scopePostCounts['1'] },
                  { scope: '2', label: 'Scope 2 — Énergie', desc: 'Électricité, chaleur et froid achetés', count: scopePostCounts['2'] },
                  { scope: '3', label: 'Scope 3 — Indirect', desc: 'Achats, transport, déplacements, déchets, immobilisations', count: scopePostCounts['3'] },
                ] as const).map(s => {
                  const cfg = SCOPE_CONFIG[s.scope]
                  return (
                    <Link
                      key={s.scope}
                      href="/collecte"
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                        <span className="text-xs font-bold text-gray-900">{s.label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{s.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{s.count} postes</span>
                        <span className="text-[10px] font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition">
                          Démarrer →
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Actions rapides pour démarrer</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { href: '/collecte/saisie', label: 'Saisie manuelle d\'une donnée', icon: '✍️', desc: 'Renseigner une activité avec son facteur d\'émission' },
                    { href: '/collecte', label: 'Voir tous les postes', icon: '📋', desc: 'Liste complète des 23 postes Bilan Carbone®' },
                    { href: '/admin/sites', label: 'Configurer vos sites', icon: '🏢', desc: 'Ajouter vos établissements et localisations' },
                    { href: '/admin/utilisateurs', label: 'Inviter des collaborateurs', icon: '👥', desc: 'Déléguer la saisie à votre équipe' },
                  ].map(a => (
                    <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition">
                      <span className="text-xl">{a.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{a.label}</p>
                        <p className="text-[10px] text-gray-400">{a.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ── WITH DATA ────────────────────────────────────────────── */
            <>
              {/* Alert if incomplete */}
              {pendingCount > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">{pendingCount} poste{pendingCount > 1 ? 's' : ''} sans données</span> — le bilan est à {completionPct}% de complétion.{' '}
                    <Link href="/collecte" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                      Compléter maintenant
                    </Link>
                  </p>
                </div>
              )}

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gray-900 rounded-2xl p-4 text-white">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Total émissions {studyYear}</p>
                  <p className="text-2xl font-bold text-primary-400 tracking-tight">{totalCo2eTonne.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">tCO₂e</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                    {completionPct}% complété
                  </div>
                </div>
                {(['1', '2', '3'] as const).map(scope => {
                  const cfg = SCOPE_CONFIG[scope]
                  const val = scopeTotals[scope]
                  const pct = totalCo2eTonne > 0 ? Math.round((val / totalCo2eTonne) * 100) : 0
                  return (
                    <div key={scope} className="bg-white rounded-2xl p-4 border border-gray-200">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">{cfg.label}</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">{val.toFixed(1)}</p>
                      <p className="text-xs text-gray-400 mt-1">tCO₂e · {pct}%</p>
                    </div>
                  )
                })}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Répartition scopes */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Répartition par scope</p>
                  {totalCo2eTonne > 0 ? (
                    <>
                      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
                        {scope1Pct > 0 && <div className="bg-red-400" style={{ width: `${scope1Pct}%` }} title={`Scope 1 · ${scope1Pct}%`} />}
                        {scope2Pct > 0 && <div className="bg-amber-400" style={{ width: `${scope2Pct}%` }} title={`Scope 2 · ${scope2Pct}%`} />}
                        {scope3Pct > 0 && <div className="bg-primary-500" style={{ width: `${scope3Pct}%` }} title={`Scope 3 · ${scope3Pct}%`} />}
                      </div>
                      <div className="space-y-3">
                        {(['1', '2', '3'] as const).map(scope => {
                          const cfg = SCOPE_CONFIG[scope]
                          const val = scopeTotals[scope]
                          const pct = totalCo2eTonne > 0 ? Math.round((val / totalCo2eTonne) * 100) : 0
                          return (
                            <div key={scope}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                                  <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900">{val.toFixed(1)} tCO₂e</span>
                                  <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6">Aucune donnée calculée pour le moment</p>
                  )}
                </div>

                {/* Top 5 emitters */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Top postes émetteurs</p>
                  {topEmitters.length > 0 ? (
                    <div className="space-y-3">
                      {topEmitters.map((e, i) => {
                        const pct = Math.round((e.co2e / maxEmitter) * 100)
                        const cfg = SCOPE_CONFIG[e.scope as '1' | '2' | '3'] ?? SCOPE_CONFIG['3']
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                                  S{e.scope}
                                </span>
                                <span className="text-xs text-gray-700 truncate">{e.name}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">{e.co2e.toFixed(1)} t</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6">Saisissez des données avec facteurs d&apos;émission pour voir ce classement</p>
                  )}
                </div>
              </div>

              {/* Complétion par scope */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avancement par scope</p>
                  <Link href="/collecte" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                    Voir tous les postes →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(['1', '2', '3'] as const).map(scope => {
                    const cfg = SCOPE_CONFIG[scope]
                    const total = scopePostCounts[scope]
                    const done = scopePostWithData[scope]
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0
                    return (
                      <div key={scope} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                            <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-500">{done}/{total}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400">{pct}% complété · {scopeTotals[scope].toFixed(1)} tCO₂e</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent entries */}
              {recentEntries.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dernières saisies</p>
                    <Link href="/collecte" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                      Voir tout →
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {recentEntries.map(entry => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const ep = entry.emission_posts as any
                      const scope = String(ep?.scope ?? '3') as '1' | '2' | '3'
                      const cfg = SCOPE_CONFIG[scope] ?? SCOPE_CONFIG['3']
                      const co2e = ((entry.co2e_calculated ?? 0) / 1000)
                      return (
                        <div key={entry.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>S{scope}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{ep?.name || '—'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{entry.description || 'Sans description'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {co2e > 0 ? (
                              <p className="text-xs font-bold text-gray-900">{co2e.toFixed(3)} tCO₂e</p>
                            ) : (
                              <p className="text-xs text-gray-400">Sans FE</p>
                            )}
                            <p className="text-[10px] text-gray-400">
                              {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
