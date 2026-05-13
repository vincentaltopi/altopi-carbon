'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/invite`,
    })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      setError(msg.includes('rate') ? 'Trop de tentatives. Attendez quelques minutes.' : 'Envoi impossible. Vérifiez votre adresse email.')
      setLoading(false)
      return
    }
    setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left — Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 px-12 py-12 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/15 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Image
            src="/images/LOGO_ALTOPI.png"
            alt="Altopi"
            width={110}
            height={36}
            className="h-9 w-auto brightness-0 invert"
          />
          <span className="text-white/20 text-2xl font-extralight">|</span>
          <span className="text-white font-bold text-xl tracking-wide">Carbon</span>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/25 text-primary-300 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            Bilan Carbone® · Méthodologie BC2025
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Pilotez votre<br />
            <span className="text-primary-400">empreinte carbone</span><br />
            avec précision
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Collectez, calculez et réduisez vos émissions GES — conforme BEGES, GHG Protocol et CSRD.
          </p>

          {/* Features */}
          <div className="mt-8 space-y-3">
            {[
              { icon: '📊', text: '23 postes Bilan Carbone® intégrés' },
              { icon: '🏗️', text: 'Module BTP exclusif — ACV chantiers' },
              { icon: '📤', text: 'Exports BEGES, GHG Protocol, CSRD' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-base">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div className="relative z-10 flex items-center gap-8 pt-8 border-t border-white/10">
          {[
            { value: '100%', label: 'Données souveraines' },
            { value: 'ISO', label: 'Conforme 14064' },
            { value: '< 5min', label: 'Première saisie' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={90}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-gray-300 text-xl font-light">|</span>
            <span className="text-gray-700 font-bold text-base">Carbon</span>
          </div>

          {forgotMode ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">Mot de passe oublié</h2>
              <p className="text-sm text-gray-500 mb-7">Entrez votre email pour recevoir un lien de réinitialisation.</p>

              {resetSent ? (
                <div className="bg-primary-50 border border-primary-200 text-primary-800 text-sm px-4 py-4 rounded-xl flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold">Email envoyé</p>
                    <p className="text-xs text-primary-600 mt-0.5">Vérifiez votre boîte mail et cliquez sur le lien.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="vous@entreprise.com"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">{error}</div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Envoi…' : 'Envoyer le lien'}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setForgotMode(false); setResetSent(false); setError(null) }}
                className="mt-5 text-sm text-gray-400 hover:text-primary-700 transition w-full text-center"
              >
                ← Retour à la connexion
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">Connexion</h2>
              <p className="text-sm text-gray-500 mb-7">Accès sur invitation uniquement.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="vous@entreprise.com"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connexion…
                    </>
                  ) : 'Se connecter'}
                </button>
              </form>

              <button
                onClick={() => { setForgotMode(true); setError(null) }}
                className="mt-4 text-sm text-gray-400 hover:text-primary-600 transition w-full text-center"
              >
                Mot de passe oublié ?
              </button>
            </>
          )}

          <p className="text-center text-gray-300 text-xs mt-10">
            Altopi Carbon © {new Date().getFullYear()} · Accès sur invitation
          </p>
        </div>
      </div>
    </div>
  )
}
