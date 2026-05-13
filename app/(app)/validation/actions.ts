'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveActivityData(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await supabase
    .from('activity_data')
    .update({ status: 'validated', validated_by: user.id, validated_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/validation')
  revalidatePath('/collecte')
  revalidatePath('/resultats')
}

export async function rejectActivityData(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await supabase
    .from('activity_data')
    .delete()
    .eq('id', id)

  revalidatePath('/validation')
  revalidatePath('/collecte')
}
