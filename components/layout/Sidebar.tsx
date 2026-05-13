'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types'

const navSections = [
  {
    label: 'Principal',
    items: [
      {
        href: '/dashboard',
        label: 'Tableau de bord',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: '/collecte',
        label: 'Collecte des données',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Analyse',
    items: [
      {
        href: '/resultats',
        label: 'Résultats & scopes',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        href: '/plan-reduction',
        label: 'Plan de réduction',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Partage',
    items: [
      {
        href: '/exports',
        label: 'Exports & rapports',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ],
  },
]

const adminSection = {
  label: 'Administration',
  items: [
    {
      href: '/admin',
      label: 'Organisations',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
        </svg>
      ),
    },
    {
      href: '/admin/utilisateurs',
      label: 'Utilisateurs',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ],
}

interface SidebarProps {
  profile: UserProfile
  completionPct?: number
  pendingPosts?: number
  studyYear?: number
}

interface SidebarContentProps extends SidebarProps {
  onNavigate?: () => void
}

function SidebarContent({ profile, onNavigate, completionPct = 0, pendingPosts = 0, studyYear }: SidebarContentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const year = studyYear ?? new Date().getFullYear()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const orgName = profile.organizations?.name ?? '—'
  const orgInitials = orgName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const sections = [...navSections]
  if (profile.role === 'admin') sections.push(adminSection)

  const statusLabel = completionPct >= 100 ? 'Validé' : completionPct > 0 ? 'En cours' : 'À démarrer'
  const statusClass = completionPct >= 100
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : completionPct > 0
    ? 'bg-primary-50 text-primary-700 border-primary-100'
    : 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image src="/images/LOGO_ALTOPI.png" alt="Altopi" width={140} height={44} className="h-12 w-auto rounded-2xl" />
          <span className="text-gray-200 text-xl font-light">|</span>
          <span className="text-gray-800 font-bold text-base tracking-wide">Carbon</span>
        </div>
      </div>

      {/* Org + Année + Progress */}
      <div className="px-3 py-3 border-b border-gray-100 space-y-2.5">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-200">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {orgInitials || 'AL'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{orgName}</p>
            <p className="text-[10px] text-gray-400">{profile.organizations?.sector ?? 'Entreprise'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white text-gray-700 text-xs rounded-lg px-2.5 py-1.5 border border-gray-200 font-medium">
            Bilan {year}
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-md font-semibold whitespace-nowrap border ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="px-0.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-gray-500 font-medium">Complétion du bilan</span>
            <span className={`text-[10px] font-bold ${completionPct >= 100 ? 'text-emerald-600' : 'text-primary-700'}`}>
              {completionPct}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
              style={{ width: `${Math.min(completionPct, 100)}%` }}
            />
          </div>
          {pendingPosts > 0 && (
            <p className="text-[10px] text-gray-400 mt-1">
              {pendingPosts} poste{pendingPosts > 1 ? 's' : ''} sans données
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold px-2.5 pt-3 pb-1">
              {section.label}
            </p>
            {section.items.map(item => {
              const active = isActive(item.href)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const badge = (item as any).badge as { text: string; variant: string } | undefined
              const showPendingBadge = item.href === '/collecte' && pendingPosts > 0 && !badge

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active ? 'bg-primary-50 text-primary-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className={active ? 'text-primary-600' : 'text-gray-400'}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {showPendingBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {pendingPosts}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {(profile.full_name || profile.email || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{profile.full_name || profile.email}</p>
            <p className="text-[10px] text-gray-400 truncate">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 w-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </div>
    </>
  )
}

export function Sidebar({ profile, completionPct = 0, pendingPosts = 0, studyYear }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white text-gray-700 rounded-lg shadow-md border border-gray-200"
        aria-label="Ouvrir le menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <aside className="hidden lg:flex flex-col h-screen w-60 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent profile={profile} completionPct={completionPct} pendingPosts={pendingPosts} studyYear={studyYear} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-xl animate-slide-in">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent profile={profile} onNavigate={() => setMobileOpen(false)} completionPct={completionPct} pendingPosts={pendingPosts} studyYear={studyYear} />
          </aside>
        </div>
      )}
    </>
  )
}
