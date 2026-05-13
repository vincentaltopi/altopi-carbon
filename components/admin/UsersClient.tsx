'use client'

import { useState } from 'react'
import { InviteUserModal } from './InviteUserModal'
import type { OrganizationMember } from '@/lib/types'

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-primary-50 text-primary-700 border-primary-200' },
  project_manager: { label: 'Resp. projet', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  contributor: { label: 'Contributeur', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  viewer: { label: 'Lecteur', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  auditor: { label: 'Auditeur', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

interface UsersClientProps {
  members: OrganizationMember[]
  organizationId: string
  currentUserId: string
}

export function UsersClient({ members, organizationId, currentUserId }: UsersClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <>
      {inviteOpen && (
        <InviteUserModal organizationId={organizationId} onClose={() => setInviteOpen(false)} />
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Inviter un utilisateur
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {members.length} membre{members.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {members.map(member => {
            const role = ROLE_LABELS[member.role] ?? { label: member.role, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
            const name = member.profiles?.full_name || member.profiles?.email || '—'
            const email = member.profiles?.email || '—'
            const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
            const isCurrentUser = member.user_id === currentUserId
            const isActive = !!member.joined_at

            return (
              <div key={member.user_id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {initials || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
                    {isCurrentUser && (
                      <span className="text-[9px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Vous</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{email}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${role.cls}`}>
                  {role.label}
                </span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} title={isActive ? 'Actif' : 'En attente'} />
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Aucun membre</p>
              <p className="text-xs text-gray-400">Invitez vos collaborateurs pour travailler ensemble.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
