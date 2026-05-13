'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Site, EmissionPost, EmissionFactor } from '@/lib/types'
import { saveActivityData, searchEmissionFactors } from '@/app/actions/activity'

type AIFillResult = {
  description: string
  quantity: number
  unit: string
  period: string
  factor_query: string
}

type LocalSpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((ev: any) => void) | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((ev: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SaisieFormProps {
  sites: Site[]
  emissionPosts: EmissionPost[]
  defaultPostId?: string
  totalCo2e?: number
  studyYear?: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const UNITS = ['kWh', 'MWh', 'GJ', 'm³', 'L', 'tonne', 'kg', 'km', 'passager.km', 'tonne.km', 'unité', 'heure']

const SCOPE_COLORS: Record<string, { dot: string; badge: string }> = {
  '1': { dot: '#ef4444', badge: 'bg-red-50 text-red-700' },
  '2': { dot: '#f59e0b', badge: 'bg-amber-50 text-amber-700' },
  '3': { dot: '#22c55e', badge: 'bg-primary-50 text-primary-700' },
}

export function SaisieForm({ sites, emissionPosts, defaultPostId, totalCo2e = 0, studyYear }: SaisieFormProps) {
  const yr = studyYear ?? new Date().getFullYear()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [postId, setPostId] = useState(defaultPostId ?? emissionPosts[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kWh')
  const [period, setPeriod] = useState(`Année ${yr} complète`)
  const [factorQuery, setFactorQuery] = useState('')
  const [factorResults, setFactorResults] = useState<EmissionFactor[]>([])
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null)
  const [factorOpen, setFactorOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const factorRef = useRef<HTMLDivElement>(null)

  // AI fill state
  const [aiFile, setAiFile] = useState<File | null>(null)
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const aiFileRef = useRef<HTMLInputElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<LocalSpeechRec | null>(null)

  const debouncedQuery = useDebounce(factorQuery, 300)

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setFactorResults([])
      return
    }
    searchEmissionFactors(debouncedQuery).then(res => {
      setFactorResults(res as EmissionFactor[])
      setFactorOpen(true)
    })
  }, [debouncedQuery])

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (factorRef.current && !factorRef.current.contains(e.target as Node)) {
        setFactorOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  const qty = parseFloat(quantity) || 0
  const factorValue = selectedFactor?.co2e_value ?? 0
  const co2eKg = qty * factorValue
  const co2eTonne = co2eKg / 1000
  const pct = totalCo2e > 0 ? Math.min((co2eTonne / totalCo2e) * 100, 100) : 0

  const selectedPost = emissionPosts.find(p => p.id === postId)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      setInterimText('')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: (new () => LocalSpeechRec) | undefined = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      showToast('error', 'Reconnaissance vocale non supportée — utilisez Chrome ou Edge')
      return
    }
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = true
    setInterimText('')
    rec.onresult = (ev) => {
      let interim = ''
      const startIdx = ev.resultIndex ?? 0
      for (let i = startIdx; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) {
          const text = r[0].transcript.trim()
          if (text) {
            setAiInstructions(prev => (prev ? prev + ' ' + text : text))
            setAiDone(false)
          }
        } else {
          interim += r[0].transcript
        }
      }
      setInterimText(interim)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (ev: any) => {
      setIsRecording(false)
      setInterimText('')
      if (ev?.error === 'not-allowed') {
        showToast('error', 'Microphone refusé — autorisez l\'accès dans les paramètres Chrome')
      } else if (ev?.error === 'no-speech') {
        showToast('error', 'Aucune voix détectée — réessayez en parlant plus fort')
      } else {
        showToast('error', 'Erreur micro — vérifiez que votre microphone est connecté')
      }
    }
    rec.onend = () => {
      setIsRecording(false)
      setInterimText('')
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setIsRecording(true)
    } catch {
      showToast('error', 'Impossible de démarrer le microphone — réessayez')
    }
  }, [isRecording, showToast])

  const handleAIFill = useCallback(async () => {
    if (!aiFile && !aiInstructions.trim()) return
    setAiLoading(true)
    setAiDone(false)
    try {
      const fd = new FormData()
      if (aiFile) fd.append('file', aiFile)
      fd.append('instructions', aiInstructions)
      const post = emissionPosts.find(p => p.id === postId)
      fd.append('post_name', post?.name ?? '')
      fd.append('post_scope', String(post?.scope ?? '3'))
      fd.append('post_desc', post?.description ?? '')
      fd.append('study_year', String(yr))

      const res = await fetch('/api/import/fill', { method: 'POST', body: fd })
      if (!res.ok) {
        const { error } = await res.json()
        showToast('error', error ?? 'Erreur IA')
        return
      }
      const data: AIFillResult = await res.json()

      if (data.description) setDescription(data.description)
      if (data.quantity > 0) setQuantity(String(data.quantity))
      if (data.unit) setUnit(data.unit)
      if (data.period) setPeriod(data.period)
      if (data.factor_query) {
        const cleanQuery = data.factor_query.replace(/\b(facteur|d'émission|emission|factor)\b/gi, '').replace(/\s+/g, ' ').trim()
        const query = cleanQuery || data.factor_query
        setFactorQuery(query)
        let factors = await searchEmissionFactors(query) as EmissionFactor[]
        // Fallback: try each individual word if the full phrase matches nothing
        if (!factors.length) {
          const words = query.split(' ').filter(w => w.length > 3)
          for (const word of words) {
            factors = await searchEmissionFactors(word) as EmissionFactor[]
            if (factors.length) break
          }
        }
        if (factors.length > 0) {
          setSelectedFactor(factors[0])
        }
      }
      setAiDone(true)
      showToast('success', 'Données extraites et appliquées !')
    } catch {
      showToast('error', 'Erreur lors de l\'analyse IA')
    } finally {
      setAiLoading(false)
    }
  }, [aiFile, aiInstructions, postId, emissionPosts, showToast])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!postId || !quantity || parseFloat(quantity) <= 0) {
      showToast('error', 'Veuillez remplir tous les champs obligatoires.')
      return
    }
    startTransition(async () => {
      try {
        await saveActivityData({
          siteId: siteId || null,
          postId,
          emissionFactorId: selectedFactor?.id ?? null,
          description,
          quantity: parseFloat(quantity),
          unit,
          period,
          co2eCalculated: co2eKg || undefined,
        })
        showToast('success', 'Donnée enregistrée avec succès !')
        setTimeout(() => router.push('/collecte'), 1500)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
      }
    })
  }, [postId, quantity, siteId, description, unit, period, selectedFactor, router, showToast, co2eKg])

  const postsByScope = (['1', '2', '3'] as const).map(scope => ({
    scope,
    posts: emissionPosts.filter(p => String(p.scope) === scope),
  }))

  return (
    <div className="p-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 max-w-5xl">

          {/* Formulaire principal */}
          <div className="space-y-4">

            {/* Localisation */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2.5 mb-4 border-b border-gray-100">
                Localisation
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Site / établissement
                  </label>
                  {sites.length > 0 ? (
                    <select
                      value={siteId}
                      onChange={e => setSiteId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                    >
                      <option value="">— Sans site spécifique —</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.type === 'siege' ? ' (Siège)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2.5 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 bg-gray-50">
                      Aucun site configuré
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Poste Bilan Carbone® <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={postId}
                    onChange={e => setPostId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  >
                    {postsByScope.map(({ scope, posts }) => posts.length > 0 && (
                      <optgroup key={scope} label={`Scope ${scope}`}>
                        {posts.map(p => (
                          <option key={p.id} value={p.id}>
                            Poste {p.order_index} — {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPost && (
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${SCOPE_COLORS[selectedPost.scope]?.badge}`}>
                    Scope {selectedPost.scope}
                  </span>
                  {selectedPost.description && (
                    <span className="text-[10px] text-gray-400">{selectedPost.description}</span>
                  )}
                </div>
              )}
            </div>

            {/* Données */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2.5 mb-4 border-b border-gray-100">
                Donnée d&apos;activité
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    placeholder="ex : Consommation de gaz naturel chauffage"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Soyez précis pour faciliter les audits</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Période</label>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  >
                    <option>{`Année ${yr} complète`}</option>
                    <option>{`T1 ${yr} (Jan-Mar)`}</option>
                    <option>{`T2 ${yr} (Avr-Jun)`}</option>
                    <option>{`T3 ${yr} (Jul-Sep)`}</option>
                    <option>{`T4 ${yr} (Oct-Déc)`}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Quantité <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    required
                    min="0"
                    step="any"
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Unité</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Facteur d'émission */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2.5 mb-4 border-b border-gray-100">
                Facteur d&apos;émission
              </p>

              {selectedFactor ? (
                <div className="flex items-start gap-3 p-3.5 bg-primary-50 border border-primary-200 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold text-primary-700 uppercase tracking-wider">✓ Sélectionné</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900">{selectedFactor.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {selectedFactor.co2e_value} kgCO₂e / {selectedFactor.unit}
                      {selectedFactor.uncertainty_percentage && ` · Incertitude ±${selectedFactor.uncertainty_percentage}%`}
                    </p>
                    {selectedFactor.source && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{selectedFactor.source}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFactor(null); setFactorQuery('') }}
                    className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div ref={factorRef} className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Rechercher un facteur d&apos;émission
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={factorQuery}
                      onChange={e => setFactorQuery(e.target.value)}
                      onFocus={() => factorResults.length > 0 && setFactorOpen(true)}
                      placeholder="ex : gaz naturel, électricité, carburant…"
                      className="w-full px-3 py-2.5 pl-9 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Tapez pour rechercher dans la Base Carbone ADEME</p>

                  {factorOpen && factorResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                      {factorResults.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => { setSelectedFactor(f); setFactorOpen(false); setFactorQuery('') }}
                          className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <p className="text-xs font-semibold text-gray-900">{f.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {f.co2e_value} kgCO₂e / {f.unit}
                            {f.source && ` · ${f.source}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {factorQuery.length >= 2 && factorResults.length === 0 && (
                    <div className="mt-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-500">
                      Aucun facteur trouvé pour &quot;{factorQuery}&quot; — vous pouvez continuer sans facteur.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Analyse IA */}
            <div className={`bg-white rounded-2xl border p-5 transition-colors ${aiDone ? 'border-primary-300 bg-primary-50/20' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  ✨ Analyse IA
                </p>
                <span className="text-[10px] font-normal text-gray-300">Optionnel — remplit le formulaire automatiquement</span>
              </div>

              {/* File drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors mb-3 ${
                  aiFile ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/10'
                }`}
                onClick={() => aiFileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) { setAiFile(f); setAiDone(false) }
                }}
              >
                <input
                  ref={aiFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setAiFile(f)
                    setAiDone(false)
                  }}
                />
                {aiFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">
                      {/pdf/.test(aiFile.name) ? '📄' : /xls|csv/.test(aiFile.name) ? '📊' : '🖼️'}
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-gray-800 truncate max-w-xs">{aiFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(aiFile.size / 1024).toFixed(0)} Ko — cliquer pour changer</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl mb-1.5">📎</div>
                    <p className="text-xs font-medium text-gray-700">Glisser-déposer ou cliquer</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Facture, relevé, contrat — PDF, Excel, CSV, image</p>
                  </>
                )}
              </div>

              {/* Instructions + vocal */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Instructions pour l&apos;IA
                  <span className="font-normal text-gray-400 ml-1">(optionnel)</span>
                </label>

                {/* Micro button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-full flex items-center justify-center gap-2 mb-2 py-2.5 rounded-xl border text-xs font-semibold transition ${
                    isRecording
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-red-500 -ml-4 absolute" />
                      En écoute — cliquer pour arrêter
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                        <path d="M19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z" />
                      </svg>
                      🎙 Dicter vos instructions
                    </>
                  )}
                </button>

                {/* Live transcript while recording */}
                {isRecording && (
                  <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl min-h-[2.5rem] flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mt-1 flex-shrink-0" />
                    <p className="text-xs text-red-700 italic leading-relaxed">
                      {interimText || <span className="text-red-400">Parlez maintenant…</span>}
                    </p>
                  </div>
                )}

                <textarea
                  value={aiInstructions}
                  onChange={e => { setAiInstructions(e.target.value); setAiDone(false) }}
                  placeholder="ex : Extraire la consommation d'électricité, facture EDF janvier–décembre 2025, siège social Paris"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition resize-none"
                />
              </div>

              {/* Analyze button */}
              <button
                type="button"
                onClick={handleAIFill}
                disabled={aiLoading || (!aiFile && !aiInstructions.trim())}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition"
              >
                {aiLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyse en cours…
                  </>
                ) : aiDone ? (
                  <>✓ Données extraites et appliquées</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyser avec l&apos;IA
                  </>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between py-2">
              <button
                type="button"
                onClick={() => router.push('/collecte')}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition"
              >
                ← Annuler
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  Brouillon
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Valider et enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Panneau calcul */}
          <div className="bg-gray-900 rounded-2xl p-5 text-white sticky top-20 self-start">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Calcul en temps réel
            </p>

            {qty > 0 && factorValue > 0 ? (
              <>
                <div className="bg-gray-800 rounded-xl p-3.5 mb-4 font-mono text-sm leading-relaxed">
                  <span className="text-primary-400 font-bold">{qty.toLocaleString('fr-FR')}</span>
                  <span className="text-gray-500"> {unit}</span>
                  <br />
                  <span className="text-gray-600">× </span>
                  <span className="text-primary-400 font-bold">{factorValue}</span>
                  <span className="text-gray-500"> kgCO₂e/{selectedFactor?.unit}</span>
                  <br />
                  <span className="text-gray-700">{'─'.repeat(16)}</span>
                  <br />
                  <span className="text-gray-500">= </span>
                  <span className="text-primary-300 font-bold">{co2eKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kgCO₂e</span>
                </div>

                <p className="text-[10px] text-gray-500 mb-1">Résultat calculé</p>
                <p className="text-4xl font-bold text-primary-400 tracking-tight">{co2eTonne.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1">tCO₂e</p>

                <div className="my-4 h-px bg-white/10" />

                <div className="bg-white/5 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-gray-500 mb-2">Équivalences</p>
                  {[
                    { icon: '🚗', text: `${Math.round(co2eTonne * 6550).toLocaleString('fr-FR')} km en voiture diesel` },
                    { icon: '✈️', text: `${Math.round(co2eTonne * 1.65)} vols Paris-New York` },
                    { icon: '🌳', text: `${Math.round(co2eTonne * 90)} arbres à planter` },
                  ].map(eq => (
                    <div key={eq.text} className="flex items-center gap-2 text-xs text-gray-300 mb-1.5 last:mb-0">
                      <span>{eq.icon}</span>
                      <span>{eq.text}</span>
                    </div>
                  ))}
                </div>

                <div className="my-4 h-px bg-white/10" />

                <p className="text-[10px] text-gray-500 mb-1.5">Part du bilan ({totalCo2e} tCO₂e)</p>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{pct.toFixed(1)}% du bilan total</p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Renseignez une quantité et sélectionnez un facteur d&apos;émission pour voir le calcul.
                </p>
              </div>
            )}
          </div>

        </div>
      </form>
    </div>
  )
}
