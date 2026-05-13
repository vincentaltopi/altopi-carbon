import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import { BilanManager } from '@/components/admin/BilanManager'

export default async function BilanPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'project_manager')) {
    redirect('/dashboard')
  }

  const { data: studies } = await supabase
    .from('studies')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('reference_year', { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Paramètres du bilan" subtitle="Gestion des bilans carbone">
        <Link
          href="/admin"
          className="text-xs font-medium text-gray-500 hover:text-gray-700 transition"
        >
          ← Retour
        </Link>
      </TopBar>
      <BilanManager
        studies={studies ?? []}
        organizationId={membership.organization_id}
      />
    </div>
  )
}
