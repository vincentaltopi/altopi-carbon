import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { PostsGrid } from '@/components/collecte/PostsGrid'
import { DeleteEntryButton } from '@/components/collecte/DeleteEntryButton'
import type { EmissionPost, ActivityData, Site } from '@/lib/types'
import Link from 'next/link'

type ActivityRow = ActivityData & {
  emission_posts: Pick<EmissionPost, 'name' | 'scope' | 'order_index'> | null
  sites: Pick<Site, 'name'> | null
}

const SCOPE_BADGE: Record<string, string> = {
  '1': 'bg-red-50 text-red-700',
  '2': 'bg-amber-50 text-amber-700',
  '3': 'bg-primary-50 text-primary-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function CollectePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user!.id)
    .single()

  const orgId = membership?.organization_id

  const [{ data: rawPosts }, { data: study }] = await Promise.all([
    supabase.from('emission_posts').select('*').order('scope').order('order_index'),
    orgId
      ? supabase.from('studies').select('id, reference_year').eq('organization_id', orgId).order('reference_year', { ascending: false }).limit(1).single()
      : Promise.resolve({ data: null }),
  ])

  const posts = (rawPosts ?? []) as EmissionPost[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studyId = (study as any)?.id ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studyYear = (study as any)?.reference_year ?? new Date().getFullYear()

  let activityCounts: Record<string, { count: number; total_co2e: number }> = {}
  let allEntries: ActivityRow[] = []

  if (studyId) {
    const { data: activities } = await supabase
      .from('activity_data')
      .select('id, description, quantity, unit, co2e_calculated, created_at, emission_post_id, emission_posts(name, scope, order_index), sites(name)')
      .eq('study_id', studyId)
      .order('created_at', { ascending: false })

    if (activities) {
      allEntries = activities as unknown as ActivityRow[]
      activityCounts = activities.reduce<Record<string, { count: number; total_co2e: number }>>((acc, a) => {
        if (!acc[a.emission_post_id]) acc[a.emission_post_id] = { count: 0, total_co2e: 0 }
        acc[a.emission_post_id].count++
        acc[a.emission_post_id].total_co2e += (a.co2e_calculated ?? 0) / 1000
        return acc
      }, {})
    }
  }

  const postsWithData = posts.map(p => ({
    id: p.id,
    order_index: p.order_index,
    name: p.name,
    scope: p.scope,
    category: p.category,
    activity_count: activityCounts[p.id]?.count ?? 0,
    total_co2e: activityCounts[p.id]?.total_co2e ?? 0,
  }))

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Collecte des données" subtitle={`${posts.length} postes · Bilan Carbone® · Bilan ${studyYear}`}>
        <Link
          href="/collecte/saisie"
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition"
        >
          + Saisie manuelle
        </Link>
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 animate-fade-in">

          {/* Table par poste + filtre + Import IA */}
          <PostsGrid posts={postsWithData} />

          {/* Données saisies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Données saisies</h2>
              {allEntries.length > 0 && (
                <span className="text-xs text-gray-400">
                  {allEntries.length} entrée{allEntries.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {allEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Aucune donnée saisie</p>
                <p className="text-xs text-gray-400 mb-4">
                  Utilisez la saisie manuelle ou l&apos;import IA pour commencer.
                </p>
                <Link
                  href="/collecte/saisie"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition"
                >
                  + Première saisie
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Poste</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Quantité</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">CO₂e</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                        <th className="px-3 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allEntries.map(entry => {
                        const scope = entry.emission_posts?.scope
                        const badge = scope ? (SCOPE_BADGE[String(scope)] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'
                        const co2e = entry.co2e_calculated != null ? entry.co2e_calculated / 1000 : null
                        return (
                          <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                {scope && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start ${badge}`}>
                                    S{scope}
                                  </span>
                                )}
                                <span className="text-xs font-medium text-gray-800 leading-tight max-w-[140px] truncate">
                                  {entry.emission_posts?.name ?? '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-gray-600 max-w-[200px] truncate">{entry.description || '—'}</p>
                              {entry.sites?.name && (
                                <p className="text-[10px] text-gray-400">{entry.sites.name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className="text-xs text-gray-600 tabular-nums">
                                {entry.quantity.toLocaleString('fr-FR')} {entry.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-xs font-bold tabular-nums ${co2e != null && co2e > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                {co2e != null ? `${co2e.toFixed(3)} tCO₂e` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <span className="text-[10px] text-gray-400">{formatDate(entry.created_at)}</span>
                            </td>
                            <td className="px-3 py-3">
                              <DeleteEntryButton id={entry.id} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
