import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ValidationClient, { type ActivityItem } from './ValidationClient'

export const dynamic = 'force-dynamic'

export default async function ValidationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') redirect('/dashboard')

  const { data: study } = await supabase
    .from('studies')
    .select('id, reference_year')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'collecting')
    .order('reference_year', { ascending: false })
    .limit(1)
    .single()

  if (!study) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Validation IA</h1>
        <p className="text-gray-500">Aucun bilan en cours.</p>
      </div>
    )
  }

  const { data: pending } = await supabase
    .from('activity_data')
    .select('id, emission_post_id, description, quantity, unit, co2e_calculated, source, created_at, profiles(full_name, email), emission_posts(name, scope)')
    .eq('study_id', study.id)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Validation IA</h1>
          <p className="text-gray-500 text-sm mt-1">
            Données importées automatiquement à valider — Bilan {study.reference_year}
          </p>
        </div>
        {(pending?.length ?? 0) > 0 && (
          <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">
            {pending?.length} en attente
          </span>
        )}
      </div>

      <ValidationClient
        items={(pending ?? []) as unknown as ActivityItem[]}
        isAdmin={profile.role === 'admin'}
      />
    </div>
  )
}
