'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function InvitePage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase redirige ici avec le token dans le hash — il est traité automatiquement
  }, [])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError("Impossible de définir le mot de passe. Le lien a peut-être expiré.")
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={120}
              height={40}
              className="h-10 w-auto brightness-0 invert"
            />
            <span className="text-white/40 text-xl font-light">|</span>
            <span className="text-white font-semibold text-lg tracking-wide">Carbon</span>
          </div>
          <p className="text-primary-200 text-sm">Vous avez été invité(e) à rejoindre la plateforme</p>
        </div>

        <div className="bg-white rounded-2xl shadow-elevated p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Créez votre mot de passe</h2>
          <p className="text-sm text-gray-500 mb-6">
            Choisissez un mot de passe sécurisé pour accéder à votre espace Altopi Carbon.
          </p>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="8 caractères minimum"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-2.5 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Activation...' : 'Activer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          Altopi Carbon © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
