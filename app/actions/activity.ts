'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function searchEmissionFactors(query: string) {
  if (!query || query.length < 2) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('emission_factors')
    .select('id, name, co2e_value, unit, source, uncertainty_percentage, category, sub_category')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(6)
  return data ?? []
}

async function getOrCreateStudy(supabase: ReturnType<typeof createClient>, organizationId: string, userId: string) {
  const year = new Date().getFullYear()
  const { data: existing } = await supabase
    .from('studies')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('reference_year', year)
    .single()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('studies')
    .insert({
      organization_id: organizationId,
      name: `Bilan Carbone ${year}`,
      reference_year: year,
      status: 'collecting',
      methodology: 'BC2025',
      scopes: ['1', '2', '3'],
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !created) throw new Error('Impossible de créer le bilan')
  return created.id
}

export async function saveActivityData(payload: {
  siteId: string | null
  postId: string
  emissionFactorId: string | null
  description: string
  quantity: number
  unit: string
  period: string
  co2eCalculated?: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership?.organization_id) throw new Error('Organisation introuvable')

  const studyId = await getOrCreateStudy(supabase, membership.organization_id, user.id)

  const { error } = await supabase.from('activity_data').insert({
    study_id: studyId,
    site_id: payload.siteId || null,
    emission_post_id: payload.postId,
    emission_factor_id: payload.emissionFactorId || null,
    description: payload.description,
    quantity: payload.quantity,
    unit: payload.unit,
    co2e_calculated: payload.co2eCalculated ?? null,
    contributor_id: user.id,
    status: 'draft',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/collecte')
  revalidatePath('/dashboard')
  revalidatePath('/resultats')
  revalidatePath('/plan-reduction')
  return { success: true }
}

export async function deleteActivityData(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('activity_data').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/collecte')
  revalidatePath('/dashboard')
  revalidatePath('/resultats')
}

export async function bulkSaveActivityData(entries: Array<{
  postId: string
  description: string
  quantity: number
  unit: string
  co2eCalculated?: number | null
}>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership?.organization_id) throw new Error('Organisation introuvable')

  const studyId = await getOrCreateStudy(supabase, membership.organization_id, user.id)

  const records = entries.map(e => ({
    study_id: studyId,
    site_id: null,
    emission_post_id: e.postId,
    emission_factor_id: null,
    description: e.description,
    quantity: e.quantity,
    unit: e.unit,
    co2e_calculated: e.co2eCalculated ?? null,
    contributor_id: user.id,
    status: 'draft',
  }))

  const { error } = await supabase.from('activity_data').insert(records)
  if (error) throw new Error(error.message)

  revalidatePath('/collecte')
  revalidatePath('/dashboard')
  revalidatePath('/resultats')
  return { success: true, count: records.length }
}
