import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { SaisieForm } from '@/components/collecte/SaisieForm'
import type { Site, EmissionPost } from '@/lib/types'
import Link from 'next/link'

export default async function SaisiePage({
  searchParams,
}: {
  searchParams: { post?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user!.id)
    .single()

  const orgId = membership?.organization_id

  const [{ data: rawSites }, { data: rawPosts }, { data: study }] = await Promise.all([
    orgId
      ? supabase.from('sites').select('*').eq('organization_id', orgId).eq('is_active', true).order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('emission_posts').select('*').order('scope').order('order_index'),
    orgId
      ? supabase
          .from('studies')
          .select('id, reference_year, activity_data(co2e_calculated)')
          .eq('organization_id', orgId)
          .order('reference_year', { ascending: false })
          .limit(1)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const sites = (rawSites ?? []) as Site[]
  const emissionPosts = (rawPosts ?? []) as EmissionPost[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studyAny = study as any
  const studyYear: number = studyAny?.reference_year ?? new Date().getFullYear()
  const totalCo2e: number = studyAny?.activity_data?.reduce(
    (s: number, r: { co2e_calculated: number | null }) => s + ((r.co2e_calculated ?? 0) / 1000),
    0
  ) ?? 0

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Saisie d'une donnée" subtitle={`Collecte des données · Bilan ${studyYear}`}>
        <Link
          href="/collecte"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition"
        >
          ← Retour
        </Link>
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <SaisieForm
          sites={sites}
          emissionPosts={emissionPosts}
          defaultPostId={searchParams.post}
          totalCo2e={totalCo2e}
          studyYear={studyYear}
        />
      </div>
    </div>
  )
}
