'use client'

import { useState, useTransition } from 'react'
import { inviteUser } from '@/app/actions/admin'

interface InviteUserModalProps {
  organizationId: string
  onClose: () => void
}

const ROLES = [
  { value: 'admin', label: 'Administrateur', desc: 'Accès complet à tout' },
  { value: 'project_manager', label: 'Responsable projet', desc: 'Gestion du bilan et de la collecte' },
  { value: 'contributor', label: 'Contributeur', desc: 'Saisie de données uniquement' },
  { value: 'viewer', label: 'Lecteur', desc: 'Consultation en lecture seule' },
  { value: 'auditor', label: 'Auditeur', desc: 'Vérification et validation' },
]

export function InviteUserModal({ organizationId, onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('contributor')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await inviteUser({ email, role, organizationId })
        setSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'invitation')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Inviter un utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Invitation envoyée !</p>
            <p className="text-xs text-gray-500 mb-5">Un email a été envoyé à <span className="font-medium">{email}</span></p>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl transition"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Adresse email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="collaborateur@entreprise.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Rôle</label>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      role === r.value ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="accent-primary-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{r.label}</p>
                      <p className="text-[10px] text-gray-500">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Envoyer l&apos;invitation
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
