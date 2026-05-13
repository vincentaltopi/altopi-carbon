'use client'

import { useState, useTransition } from 'react'
import { createSite, deleteSite } from '@/app/actions/admin'

type Site = {
  id: string
  name: string
  type: string
  city: string | null
  is_active: boolean
  organization_id: string
}

type Props = {
  sites: Site[]
  organizationId: string
}

const SITE_TYPE_LABELS: Record<string, string> = {
  siege: 'Siège social',
  filiale: 'Filiale',
  agence: 'Agence',
  usine: 'Usine',
  entrepot: 'Entrepôt',
  boutique: 'Boutique',
  chantier: 'Chantier',
  autre: 'Autre',
}

const SITE_TYPE_ICONS: Record<string, string> = {
  siege: '🏢',
  filiale: '🏬',
  agence: '🏪',
  usine: '🏭',
  entrepot: '🏗️',
  boutique: '🛍️',
  chantier: '⚒️',
  autre: '📍',
}

export function SitesManager({ sites, organizationId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'siege',
    city: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formData.name.trim()) {
      setError('Le nom du site est requis.')
      return
    }
    startTransition(async () => {
      try {
        await createSite({
          name: formData.name.trim(),
          type: formData.type,
          city: formData.city.trim() || null,
          organizationId,
        })
        setShowModal(false)
        setFormData({ name: '', type: 'siege', city: '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le site "${name}" ? Cette action est irréversible.`)) return
    startTransition(async () => {
      try {
        await deleteSite(id)
      } catch {
        // silent
      }
    })
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl animate-fade-in space-y-4">

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {sites.length} site{sites.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                + Nouveau site
              </button>
            </div>

            {sites.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {sites.map(site => (
                  <div key={site.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                      {SITE_TYPE_ICONS[site.type] ?? '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{site.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {SITE_TYPE_LABELS[site.type] ?? site.type}
                        {site.city ? ` · ${site.city}` : ''}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${site.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                    <button
                      onClick={() => handleDelete(site.id, site.name)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Supprimer ce site"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                  🏢
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Aucun site configuré</p>
                <p className="text-xs text-gray-400 mb-4">Ajoutez vos établissements pour affiner le périmètre du bilan.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  Ajouter un site
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Nouveau site</h3>
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nom du site <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex. Siège Paris 8e"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-400"
                >
                  <option value="siege">Siège social</option>
                  <option value="filiale">Filiale</option>
                  <option value="agence">Agence</option>
                  <option value="usine">Usine</option>
                  <option value="entrepot">Entrepôt</option>
                  <option value="boutique">Boutique</option>
                  <option value="chantier">Chantier</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Ville</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ex. Paris"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null) }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isPending ? 'Création…' : 'Créer le site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
