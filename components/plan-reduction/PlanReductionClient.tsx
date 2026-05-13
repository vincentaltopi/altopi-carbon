'use client'

import { useState, useTransition } from 'react'
import {
  createReductionAction,
  deleteReductionAction,
} from '@/app/actions/admin'

type Action = {
  id: string
  titre: string
  scope: number
  priorite: string
  statut: string
  gain_estime_co2e: number
  echeance_annee: number | null
  progress: number
  description: string | null
}

type Props = {
  totalCo2e: number
  studyYear: number
  scope1: number
  scope2: number
  scope3: number
  topEmitters: Array<{ name: string; scope: string; co2e: number }>
  actions: Action[]
  orgId: string
  studyId: string | null
}

const scopeColors: Record<number, string> = {
  1: 'bg-red-50 text-red-700',
  2: 'bg-amber-50 text-amber-700',
  3: 'bg-primary-50 text-primary-700',
}

const scopeBorderColors: Record<string, string> = {
  '1': 'border-red-200 bg-red-50',
  '2': 'border-amber-200 bg-amber-50',
  '3': 'border-primary-100 bg-primary-50',
}

const prioriteColors: Record<string, string> = {
  Haute: 'bg-red-50 text-red-600',
  Moyenne: 'bg-amber-50 text-amber-600',
  Basse: 'bg-gray-100 text-gray-500',
}

const statutColors: Record<string, string> = {
  'En cours': 'bg-blue-50 text-blue-700',
  'Planifié': 'bg-purple-50 text-purple-700',
  "À l'étude": 'bg-gray-100 text-gray-500',
  'Réalisé': 'bg-emerald-50 text-emerald-700',
}

export function PlanReductionClient({
  totalCo2e,
  studyYear,
  scope1,
  scope2,
  scope3,
  topEmitters,
  actions,
  orgId,
  studyId,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    scope: '3',
    priorite: 'Moyenne',
    statut: "À l'étude",
    gainEstimeCo2e: '',
    echeanceAnnee: '',
    responsable: '',
  })

  const totalPlanned = actions.reduce((sum, a) => sum + (a.gain_estime_co2e ?? 0), 0)
  const objectif2030 = totalCo2e * 0.6

  const years = [
    { year: studyYear - 2, value: totalCo2e * 1.12, color: '#9ca3af', projected: false, label: false },
    { year: studyYear - 1, value: totalCo2e * 1.06, color: '#6b7280', projected: false, label: false },
    { year: studyYear, value: totalCo2e, color: '#16a34a', projected: false, label: true },
    { year: studyYear + 1, value: totalCo2e * 0.92, color: '#22c55e', projected: true, label: false },
    { year: studyYear + 2, value: totalCo2e * 0.84, color: '#4ade80', projected: true, label: false },
    { year: studyYear + 3, value: totalCo2e * 0.76, color: '#86efac', projected: true, label: false },
    { year: Math.max(2030, studyYear + 5), value: totalCo2e * 0.60, color: '#bbf7d0', projected: true, label: false },
  ]

  const maxValue = Math.max(...years.map(y => y.value))

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formData.titre.trim()) {
      setError('Le titre est requis.')
      return
    }
    startTransition(async () => {
      try {
        await createReductionAction({
          organizationId: orgId,
          studyId: studyId,
          titre: formData.titre.trim(),
          description: formData.description.trim() || null,
          scope: parseInt(formData.scope),
          priorite: formData.priorite,
          statut: formData.statut,
          gainEstimeCo2e: parseFloat(formData.gainEstimeCo2e) || 0,
          echeanceAnnee: formData.echeanceAnnee ? parseInt(formData.echeanceAnnee) : null,
          responsable: formData.responsable.trim() || null,
        })
        setShowModal(false)
        setFormData({
          titre: '',
          description: '',
          scope: '3',
          priorite: 'Moyenne',
          statut: "À l'étude",
          gainEstimeCo2e: '',
          echeanceAnnee: '',
          responsable: '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette action de réduction ?')) return
    startTransition(async () => {
      try {
        await deleteReductionAction(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 animate-fade-in">

          {/* KPI Cards — row 1 : total + scopes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-900 rounded-2xl p-4 text-white col-span-2 lg:col-span-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Total {studyYear}</p>
              <p className="text-2xl font-bold text-primary-400">{totalCo2e.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">tCO₂e</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2">Scope 1</p>
              <p className="text-xl font-bold text-red-500">{scope1.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">tCO₂e · {totalCo2e > 0 ? Math.round((scope1 / totalCo2e) * 100) : 0}%</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-2">Scope 2</p>
              <p className="text-xl font-bold text-amber-500">{scope2.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">tCO₂e · {totalCo2e > 0 ? Math.round((scope2 / totalCo2e) * 100) : 0}%</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-[10px] text-primary-500 uppercase tracking-wider mb-2">Scope 3</p>
              <p className="text-xl font-bold text-primary-600">{scope3.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">tCO₂e · {totalCo2e > 0 ? Math.round((scope3 / totalCo2e) * 100) : 0}%</p>
            </div>
          </div>

          {/* KPI Cards — row 2 : plan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Réductions planifiées</p>
              <p className="text-2xl font-bold text-primary-600">−{totalPlanned.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">tCO₂e identifiées</p>
            </div>
            <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100">
              <p className="text-[10px] text-primary-500 uppercase tracking-wider mb-2">Objectif 2030</p>
              <p className="text-2xl font-bold text-primary-700">−40%</p>
              <p className="text-xs text-primary-400 mt-1">{objectif2030.toFixed(1)} tCO₂e cible</p>
            </div>
          </div>

          {/* Trajectory Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trajectoire de réduction</p>
              <span className="text-xs text-gray-400">Aligné SBTi 1,5°C</span>
            </div>
            <div className="flex items-end gap-2 h-28">
              {years.map(bar => {
                const heightPct = maxValue > 0 ? (bar.value / maxValue) * 100 : 0
                return (
                  <div key={bar.year} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-semibold text-gray-500">{bar.value.toFixed(0)}</span>
                    <div
                      className={`w-full rounded-t-md ${bar.projected ? 'opacity-70' : ''}`}
                      style={{ height: `${heightPct}%`, background: bar.color }}
                    />
                    <span className={`text-[9px] ${bar.label ? 'font-bold text-primary-700' : 'text-gray-400'}`}>
                      {bar.label ? `${bar.year} ★` : bar.year}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              en tCO₂e · barres claires = projections SBTi 1,5°C
            </p>
          </div>

          {/* Top 5 Emitters */}
          {topEmitters.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">
                Top 5 postes émetteurs — opportunités de réduction
              </p>
              <div className="space-y-3">
                {topEmitters.map((emitter, i) => {
                  const pct = totalCo2e > 0 ? (emitter.co2e / totalCo2e) * 100 : 0
                  return (
                    <div key={emitter.name} className={`rounded-xl border p-3 ${scopeBorderColors[emitter.scope] ?? 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-500">#{i + 1}</span>
                          <span className="text-xs font-semibold text-gray-800 truncate">{emitter.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${scopeColors[parseInt(emitter.scope)]}`}>
                            S{emitter.scope}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-gray-700 flex-shrink-0 ml-2">
                          {emitter.co2e.toFixed(1)} t
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gray-600/30"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-500 mt-1">{pct.toFixed(1)}% des émissions totales</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions List */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {actions.length} action{actions.length !== 1 ? 's' : ''} identifiée{actions.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                + Ajouter une action
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Aucune action planifiée</p>
                <p className="text-xs text-gray-400 mb-4">Définissez vos premières actions de réduction carbone.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  Ajouter ma première action
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {actions.map(action => (
                  <div key={action.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${scopeColors[action.scope] ?? 'bg-gray-100 text-gray-500'}`}>
                            S{action.scope}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${prioriteColors[action.priorite] ?? 'bg-gray-100 text-gray-500'}`}>
                            {action.priorite}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statutColors[action.statut] ?? 'bg-gray-100 text-gray-500'}`}>
                            {action.statut}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 mb-1">{action.titre}</p>
                        {action.description && (
                          <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{action.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-xs h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${action.progress ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">{action.progress ?? 0}%</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                        <div>
                          <p className="text-sm font-bold text-primary-600">
                            −{action.gain_estime_co2e?.toFixed(1) ?? 0} t
                          </p>
                          {action.echeance_annee && (
                            <p className="text-[10px] text-gray-400">Échéance {action.echeance_annee}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(action.id)}
                          disabled={isPending}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Action Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Nouvelle action de réduction</h3>
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Titre <span className="text-red-400">*</span>
                </label>
                <input
                  name="titre"
                  value={formData.titre}
                  onChange={handleChange}
                  placeholder="Ex. Électrification de la flotte"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Détails optionnels sur l'action..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Scope</label>
                  <select
                    name="scope"
                    value={formData.scope}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-400"
                  >
                    <option value="1">Scope 1</option>
                    <option value="2">Scope 2</option>
                    <option value="3">Scope 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Priorité</label>
                  <select
                    name="priorite"
                    value={formData.priorite}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-400"
                  >
                    <option>Haute</option>
                    <option>Moyenne</option>
                    <option>Basse</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Statut</label>
                  <select
                    name="statut"
                    value={formData.statut}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-400"
                  >
                    <option>À l&apos;étude</option>
                    <option>Planifié</option>
                    <option>En cours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Gain estimé (tCO₂e)
                  </label>
                  <input
                    name="gainEstimeCo2e"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.gainEstimeCo2e}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Échéance (année)
                  </label>
                  <input
                    name="echeanceAnnee"
                    type="number"
                    min="2024"
                    max="2050"
                    value={formData.echeanceAnnee}
                    onChange={handleChange}
                    placeholder="2027"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Responsable
                </label>
                <input
                  name="responsable"
                  value={formData.responsable}
                  onChange={handleChange}
                  placeholder="Nom ou équipe responsable"
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
                  {isPending ? 'Enregistrement…' : 'Ajouter l\'action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
