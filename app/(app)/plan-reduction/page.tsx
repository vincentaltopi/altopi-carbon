import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { PlanReductionClient } from '@/components/plan-reduction/PlanReductionClient'

export default async function PlanReductionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/auth/login')
  const orgId = membership.organization_id

  const { data: study } = await supabase
    .from('studies')
    .select('id, reference_year, name')
    .eq('organization_id', orgId)
    .order('reference_year', { ascending: false })
    .limit(1)
    .single()

  const { data: activityData } = study
    ? await supabase
        .from('activity_data')
        .select('co2e_calculated, emission_posts(name, scope)')
        .eq('study_id', study.id)
    : { data: null }

  if (!activityData || activityData.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Plan de réduction" subtitle="Aucun bilan disponible" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="rounded-2xl border border-gray-200 p-10 text-center max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-800 mb-1">Aucune donnée de bilan disponible</p>
            <p className="text-[11px] text-gray-500 mb-5">
              Commencez par collecter vos données d&apos;émissions pour générer votre plan de réduction.
            </p>
            <Link
              href="/collecte"
              className="inline-block text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              Aller à la collecte
            </Link>
          </div>
        </div>
      </div>
    )
  }

  let totalCo2e = 0
  let scope1 = 0
  let scope2 = 0
  let scope3 = 0

  const postMap = new Map<string, { name: string; scope: string; co2e: number }>()

  for (const row of activityData) {
    const co2eKg = row.co2e_calculated ?? 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = row.emission_posts as any
    const scopeVal = post?.scope ? String(post.scope) : '3'
    const tonne = co2eKg / 1000

    totalCo2e += tonne
    if (scopeVal === '1') scope1 += tonne
    else if (scopeVal === '2') scope2 += tonne
    else scope3 += tonne

    if (post?.name) {
      const existing = postMap.get(post.name)
      if (existing) {
        existing.co2e += tonne
      } else {
        postMap.set(post.name, { name: post.name, scope: scopeVal, co2e: tonne })
      }
    }
  }

  const topEmitters = Array.from(postMap.values())
    .sort((a, b) => b.co2e - a.co2e)
    .slice(0, 5)

  const { data: actions } = study
    ? await supabase
        .from('reduction_actions')
        .select('id, titre, scope, priorite, statut, gain_estime_co2e, echeance_annee, progress, description')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
    : { data: null }

  const studyYear = study?.reference_year ?? new Date().getFullYear()
  const studyId = study?.id ?? null

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Plan de réduction"
        subtitle={`Bilan ${studyYear} · ${totalCo2e.toFixed(1)} tCO₂e`}
      />
      <PlanReductionClient
        totalCo2e={totalCo2e}
        studyYear={studyYear}
        scope1={scope1}
        scope2={scope2}
        scope3={scope3}
        topEmitters={topEmitters}
        actions={actions ?? []}
        orgId={orgId}
        studyId={studyId}
      />
    </div>
  )
}
