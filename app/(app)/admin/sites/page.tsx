import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import { SitesManager } from '@/components/admin/SitesManager'

export default async function SitesPage() {
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

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('name')

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Sites & établissements" subtitle="Périmètre organisationnel du bilan">
        <Link
          href="/admin"
          className="text-xs font-medium text-gray-500 hover:text-gray-700 transition"
        >
          ← Retour
        </Link>
      </TopBar>
      <SitesManager
        sites={sites ?? []}
        organizationId={membership.organization_id}
      />
    </div>
  )
}
