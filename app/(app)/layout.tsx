import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { UserProfile, UserRole } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name').eq('id', user.id).single(),
    supabase.from('organization_members').select('role, organization_id, organizations(*)').eq('user_id', user.id).single(),
  ])

  if (!profile) redirect('/login')

  const orgId = membership?.organization_id ?? null

  // Compute real study stats for sidebar
  let completionPct = 0
  let pendingPosts = 0
  let studyYear = new Date().getFullYear()

  if (orgId) {
    const [studyRes, postCountRes] = await Promise.all([
      supabase.from('studies').select('id, reference_year').eq('organization_id', orgId).order('reference_year', { ascending: false }).limit(1).single(),
      supabase.from('emission_posts').select('id', { count: 'exact', head: true }),
    ])
    const study = studyRes.data
    const totalPosts = postCountRes.count ?? 0
    if (study) {
      studyYear = study.reference_year
      const { data: acts } = await supabase
        .from('activity_data')
        .select('emission_post_id')
        .eq('study_id', study.id)
      const uniquePosts = new Set((acts ?? []).map(a => a.emission_post_id)).size
      completionPct = totalPosts > 0 ? Math.round((uniquePosts / totalPosts) * 100) : 0
      pendingPosts = totalPosts - uniquePosts
    } else {
      pendingPosts = totalPosts
    }
  }

  const userProfile: UserProfile = {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: (membership?.role ?? 'viewer') as UserRole,
    organization_id: orgId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    organizations: (Array.isArray(membership?.organizations) ? (membership!.organizations as any)[0] : membership?.organizations) ?? null,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        profile={userProfile}
        completionPct={completionPct}
        pendingPosts={pendingPosts}
        studyYear={studyYear}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
