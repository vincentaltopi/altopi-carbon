import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(*)')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    redirect('/dashboard')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations) as any

  const [{ count: memberCount }, { count: studyCount }, { data: currentStudy }] = await Promise.all([
    supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('organization_id', membership.organization_id),
    supabase.from('studies').select('id', { count: 'exact', head: true }).eq('organization_id', membership.organization_id),
    supabase.from('studies').select('reference_year, status').eq('organization_id', membership.organization_id).order('reference_year', { ascending: false }).limit(1).single(),
  ])

  const currentBilanLabel = currentStudy
    ? `Bilan ${currentStudy.reference_year}`
    : 'Aucun bilan'

  const orgInitials = (org?.name ?? '').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'AL'

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Administration" subtitle="Gestion de votre organisation" />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-3xl animate-fade-in">

          {/* Org card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {orgInitials}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900">{org?.name ?? '—'}</h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {org?.siren && (
                    <span className="text-[10px] text-gray-500">SIREN : <span className="font-medium text-gray-700">{org.siren}</span></span>
                  )}
                  {org?.sector && (
                    <span className="text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-100 font-medium">{org.sector}</span>
                  )}
                  {org?.headcount && (
                    <span className="text-[10px] text-gray-500">{org.headcount.toLocaleString('fr-FR')} salariés</span>
                  )}
                </div>
              </div>
              <Link
                href="/admin/bilan"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition flex-shrink-0"
              >
                Paramètres →
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Membres actifs', value: memberCount ?? 0, icon: '👥', href: '/admin/utilisateurs' },
              { label: 'Bilans créés', value: studyCount ?? 0, icon: '📊', href: '/admin/bilan' },
              { label: 'Bilan actif', value: currentBilanLabel, icon: '⚡', href: '/dashboard' },
            ].map(stat => (
              <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 hover:bg-primary-50/20 transition-colors">
                <span className="text-xl">{stat.icon}</span>
                <p className="text-lg font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
              </Link>
            ))}
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions rapides</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: 'Gérer les utilisateurs', desc: 'Invitations, rôles et permissions', href: '/admin/utilisateurs', icon: '👥' },
                { label: 'Configurer les sites', desc: 'Ajouter ou modifier les établissements', href: '/admin/sites', icon: '🏢' },
                { label: 'Paramètres du bilan', desc: 'Année, périmètre, méthodologie', href: '/admin/bilan', icon: '⚙️' },
              ].map(action => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-lg">{action.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-900">{action.label}</p>
                    <p className="text-[10px] text-gray-400">{action.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
