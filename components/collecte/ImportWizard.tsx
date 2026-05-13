'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { bulkSaveActivityData } from '@/app/actions/activity'

type ExtractedEntry = {
  post_id: string
  post_name: string
  post_scope: string
  description: string
  quantity: number
  unit: string
  co2e_kgCO2e: number | null
  factor_hint: string | null
}

const SCOPE_BADGE: Record<string, string> = {
  '1': 'bg-red-100 text-red-700',
  '2': 'bg-amber-100 text-amber-700',
  '3': 'bg-primary-100 text-primary-700',
}

const ACCEPT = '.pdf,.xlsx,.xls,.ods,.csv,.txt,.png,.jpg,.jpeg,.webp'

type Tab = 'file' | 'text' | 'vocal'

type SpeechRecognitionEvent = Event & { results: SpeechRecognitionResultList }
type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export function ImportWizard({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('file')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<ExtractedEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Clean up recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) { setFile(dropped); setError(null) }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError(null) }
  }

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Reconnaissance vocale non supportée sur ce navigateur (utilisez Chrome).'); return }
    const r = new SR()
    r.lang = 'fr-FR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (ev) => {
      const t = Array.from(ev.results).map((res: SpeechRecognitionResult) => res[0].transcript).join(' ')
      setTranscript(t)
    }
    r.onerror = () => { setRecording(false) }
    r.onend = () => { setRecording(false) }
    recognitionRef.current = r
    r.start()
    setRecording(true)
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const analyze = async () => {
    setError(null)
    setLoading(true)
    setEntries([])

    try {
      const fd = new FormData()
      if (tab === 'file') {
        if (!file) { setError('Sélectionnez un fichier.'); setLoading(false); return }
        fd.append('type', 'file')
        fd.append('file', file)
      } else {
        const content = tab === 'vocal' ? transcript : text
        if (!content.trim()) { setError('Entrez du texte ou dictez votre message.'); setLoading(false); return }
        fd.append('type', 'text')
        fd.append('content', content)
      }

      const res = await fetch('/api/import/analyze', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Erreur inconnue')
        return
      }

      if (!json.entries?.length) {
        setError('Aucune donnée d\'émission identifiée. Essayez avec un contenu plus détaillé.')
        return
      }

      setEntries(json.entries)
    } catch {
      setError('Impossible de contacter l\'API. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  const updateEntry = (i: number, field: keyof ExtractedEntry, value: string | number | null) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const removeEntry = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i))

  const importAll = async () => {
    setSaving(true)
    try {
      await bulkSaveActivityData(entries.map(e => ({
        postId: e.post_id,
        description: e.description,
        quantity: e.quantity,
        unit: e.unit,
        co2eCalculated: e.co2e_kgCO2e ?? null,
      })))
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import')
      setSaving(false)
    }
  }

  const hasEntries = entries.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Import IA</h2>
            <p className="text-[10px] text-gray-400">Claude analyse votre document et remplit les postes automatiquement</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasEntries ? (
            <div className="p-6 space-y-5">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {([
                  { id: 'file', label: 'Document', icon: '📄' },
                  { id: 'text', label: 'Texte', icon: '✍️' },
                  { id: 'vocal', label: 'Vocal', icon: '🎤' },
                ] as { id: Tab; label: string; icon: string }[]).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* File tab */}
              {tab === 'file' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                    dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                    {file ? '✅' : '📁'}
                  </div>
                  {file ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} Ko · Cliquez pour changer</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-700">Glissez un fichier ici</p>
                      <p className="text-xs text-gray-400">ou cliquez pour parcourir</p>
                      <p className="text-[10px] text-gray-300 mt-1">PDF · Excel (.xlsx/.xls) · CSV · Image (PNG, JPG)</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {/* Text tab */}
              {tab === 'text' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Décrivez vos activités en texte libre. Exemple : <span className="italic text-gray-400">&quot;50 000 kWh d&apos;électricité, 2 000 L de gazole, 15 000 km en avion, 3 tonnes de déchets&quot;</span>
                  </p>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={8}
                    placeholder="Décrivez vos activités et consommations ici..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-300"
                  />
                </div>
              )}

              {/* Vocal tab */}
              {tab === 'vocal' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Dictez vos activités à voix haute. Claude extraira automatiquement les données et les associera aux postes d&apos;émission correspondants.
                  </p>
                  <div className="flex flex-col items-center gap-4 py-6">
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        recording
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                          : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {recording ? (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.93V19H9a1 1 0 000 2h6a1 1 0 000-2h-2v-2.07A7 7 0 0019 10z" />
                        </svg>
                      )}
                    </button>
                    <p className="text-xs font-medium text-gray-600">
                      {recording ? '🔴 Enregistrement en cours... (cliquez pour arrêter)' : 'Cliquez pour parler'}
                    </p>
                  </div>
                  {transcript && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Transcription</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Preview des résultats */
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900">{entries.length} entrée{entries.length > 1 ? 's' : ''} identifiée{entries.length > 1 ? 's' : ''}</p>
                <button
                  onClick={() => setEntries([])}
                  className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 underline"
                >
                  ← Recommencer
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Poste</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantité</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">CO₂e estimé</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((e, i) => (
                      <tr key={i} className="bg-white hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start ${SCOPE_BADGE[e.post_scope] ?? 'bg-gray-100 text-gray-600'}`}>
                              S{e.post_scope}
                            </span>
                            <span className="text-[10px] font-medium text-gray-800 leading-tight max-w-[130px] truncate" title={e.post_name}>
                              {e.post_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={e.description}
                            onChange={ev => updateEntry(i, 'description', ev.target.value)}
                            className="w-full text-xs text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary-400 focus:outline-none py-0.5 min-w-[120px]"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={e.quantity}
                              onChange={ev => updateEntry(i, 'quantity', parseFloat(ev.target.value) || 0)}
                              className="w-16 text-xs text-right text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary-400 focus:outline-none"
                            />
                            <input
                              value={e.unit}
                              onChange={ev => updateEntry(i, 'unit', ev.target.value)}
                              className="w-10 text-xs text-gray-400 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary-400 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-xs font-medium tabular-nums ${e.co2e_kgCO2e != null ? 'text-gray-900' : 'text-gray-300'}`}>
                            {e.co2e_kgCO2e != null ? `${(e.co2e_kgCO2e / 1000).toFixed(3)} tCO₂e` : '—'}
                          </span>
                          {e.factor_hint && (
                            <p className="text-[9px] text-gray-300 truncate max-w-[100px]" title={e.factor_hint}>{e.factor_hint}</p>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => removeEntry(i)}
                            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs font-semibold text-primary-700">{entries.length} données importées avec succès</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">
            {hasEntries
              ? 'Vous pouvez modifier les valeurs avant d\'importer'
              : 'Powered by Claude · Les valeurs CO₂e sont des estimations'
            }
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            {hasEntries ? (
              <button
                onClick={importAll}
                disabled={saving || saved || entries.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Import...
                  </>
                ) : `Importer ${entries.length} donnée${entries.length > 1 ? 's' : ''}`}
              </button>
            ) : (
              <button
                onClick={analyze}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Claude analyse...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyser avec Claude IA
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
