'use client'

import { useState, useTransition } from 'react'
import { createStudy } from '@/app/actions/admin'

type Study = {
  id: string
  name: string
  reference_year: number
  status: string
  methodology: string
  scopes: string[] | null
}

type Props = {
  studies: Study[]
  organizationId: string
}

const METHODOLOGY_LABELS: Record<string, string> = {
  BC2025: 'Bilan Carbone® 2025',
  BC_V8: 'Bilan Carbone® v8',
  GHG_PROTOCOL: 'GHG Protocol',
  ISO_14064: 'ISO 14064',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-500' },
  scoping: { label: 'Cadrage', cls: 'bg-blue-50 text-blue-700' },
  collecting: { label: 'Collecte', cls: 'bg-amber-50 text-amber-700' },
  calculating: { label: 'Calcul', cls: 'bg-purple-50 text-purple-700' },
  validated: { label: 'Validé', cls: 'bg-emerald-50 text-emerald-700' },
  archived: { label: 'Archivé', cls: 'bg-gray-100 text-gray-400' },
}

const currentYear = new Date().getFullYear()

export function BilanManager({ studies, organizationId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [yearWarning, setYearWarning] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    referenceYear: String(currentYear),
    name: `Bilan Carbone ${currentYear}`,
    methodology: 'BC2025',
  })

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const year = e.target.value
    setFormData(prev => ({
      ...prev,
      referenceYear: year,
      name: `Bilan Carbone ${year}`,
    }))
    const parsed = parseInt(year)
    if (!isNaN(parsed) && studies.some(s => s.reference_year === parsed)) {
      setYearWarning(`Un bilan existe déjà pour l'année ${parsed}.`)
    } else {
      setYearWarning(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const year = parseInt(formData.referenceYear)
    if (isNaN(year) || year < 2000 || year > 2100) {
      setError("L'année de référence est invalide.")
      return
    }
    if (!formData.name.trim()) {
      setError('Le nom du bilan est requis.')
      return
    }
    startTransition(async () => {
      try {
        await createStudy({
          name: formData.name.trim(),
          referenceYear: year,
          methodology: formData.methodology,
          organizationId,
        })
        setShowModal(false)
        setFormData({
          referenceYear: String(currentYear),
          name: `Bilan Carbone ${currentYear}`,
          methodology: 'BC2025',
        })
        setYearWarning(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
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
                {studies.length} bilan{studies.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                + Nouveau bilan
              </button>
            </div>

            {studies.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {studies.map(study => {
                  const status = STATUS_LABELS[study.status] ?? { label: study.status, cls: 'bg-gray-100 text-gray-500' }
                  return (
                    <div key={study.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {study.reference_year}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900">{study.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {METHODOLOGY_LABELS[study.methodology] ?? study.methodology}
                          {study.scopes?.length ? ` · Scope ${study.scopes.join(', ')}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                  📊
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Aucun bilan créé</p>
                <p className="text-xs text-gray-400 mb-4">Créez votre premier bilan pour commencer la collecte.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  Créer mon premier bilan
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
              <h3 className="text-sm font-bold text-gray-900">Nouveau bilan carbone</h3>
              <button
                onClick={() => { setShowModal(false); setError(null); setYearWarning(null) }}
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
                  Année de référence <span className="text-red-400">*</span>
                </label>
                <input
                  name="referenceYear"
                  type="number"
                  min="2000"
                  max="2100"
                  value={formData.referenceYear}
                  onChange={handleYearChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  required
                />
                {yearWarning && (
                  <p className="text-[10px] text-amber-600 mt-1">{yearWarning}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nom du bilan <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={`Bilan Carbone ${currentYear}`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Méthodologie</label>
                <select
                  name="methodology"
                  value={formData.methodology}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-400"
                >
                  <option value="BC2025">Bilan Carbone® 2025</option>
                  <option value="BC_V8">Bilan Carbone® v8</option>
                  <option value="GHG_PROTOCOL">GHG Protocol</option>
                  <option value="ISO_14064">ISO 14064</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null); setYearWarning(null) }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isPending ? 'Création…' : 'Créer le bilan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
