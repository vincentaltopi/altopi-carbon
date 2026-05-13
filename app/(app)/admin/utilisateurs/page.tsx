import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { UsersClient } from '@/components/admin/UsersClient'
import type { OrganizationMember } from '@/lib/types'

export default async function UtilisateursPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'project_manager')) {
    redirect('/dashboard')
  }

  const { data: members } = await supabase
    .from('organization_members')
    .select('*, profiles(id, email, full_name)')
    .eq('organization_id', membership.organization_id)
    .order('invited_at')

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Utilisateurs" subtitle="Gestion des accès et invitations">
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl animate-fade-in">
          <UsersClient
            members={(members ?? []) as OrganizationMember[]}
            organizationId={membership.organization_id}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
