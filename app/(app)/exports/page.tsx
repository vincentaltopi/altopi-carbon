import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'

export default async function ExportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/auth/login')
  const orgId = membership.organization_id

  const { data: study } = await supabase
    .from('studies')
    .select('id, reference_year, name')
    .eq('organization_id', orgId)
    .order('reference_year', { ascending: false })
    .limit(1)
    .single()

  let completionPct = 0
  let totalCo2e = 0

  if (study) {
    const { count: totalPosts } = await supabase
      .from('emission_posts')
      .select('id', { count: 'exact', head: true })

    const { data: activityData } = await supabase
      .from('activity_data')
      .select('emission_post_id, co2e_calculated')
      .eq('study_id', study.id)

    if (activityData && totalPosts) {
      const coveredPosts = new Set(activityData.map(r => r.emission_post_id)).size
      completionPct = Math.round((coveredPosts / totalPosts) * 100)
      totalCo2e = activityData.reduce((sum, r) => sum + (r.co2e_calculated ?? 0), 0) / 1000
    }
  }

  const isComplete = completionPct >= 100
  const subtitleLabel = study
    ? `Bilan ${study.reference_year} · ${completionPct}% complété`
    : 'Aucun bilan disponible'

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Exports & rapports" subtitle={subtitleLabel}>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-full ${
            isComplete
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isComplete ? `${completionPct}% complété` : `⚠ ${completionPct}% complété`}
        </span>
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 animate-fade-in">

          {!isComplete && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200/60 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Bilan à {completionPct}% de complétion</span> — Les exports officiels
                BEGES et GHG Protocol nécessitent 100% de complétion. Vous pouvez générer des exports de données
                brutes dès maintenant.
              </p>
            </div>
          )}

          {study && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {study.reference_year}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{study.name}</p>
                <p className="text-[10px] text-gray-400">{totalCo2e.toFixed(1)} tCO₂e total · {completionPct}% des postes couverts</p>
              </div>
            </div>
          )}

          {/* Exports données brutes */}
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Export données brutes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* XLSX */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col hover:border-primary-300 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1.5">Export Excel</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                  Toutes les données d&apos;activité avec résumé par scope, facteurs d&apos;émission et calculs détaillés — idéal pour audit.
                </p>
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold font-mono">XLSX</span>
                  {study ? (
                    <a
                      href="/api/export?format=xlsx"
                      download={`altopi-carbon-bilan-${study.reference_year}.xlsx`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
                    >
                      Télécharger →
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">Aucun bilan</span>
                  )}
                </div>
              </div>

              {/* CSV */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col hover:border-primary-300 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1.5">Export CSV</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                  Format tabulaire brut pour traitement externe, intégration BI ou import dans d&apos;autres outils.
                </p>
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold font-mono">CSV</span>
                  {study ? (
                    <a
                      href="/api/export?format=csv"
                      download={`altopi-carbon-bilan-${study.reference_year}.csv`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
                    >
                      Télécharger →
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">Aucun bilan</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Rapport analytique */}
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Rapports analytiques</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col opacity-60 cursor-not-allowed">
              <div className="w-11 h-11 rounded-xl bg-yellow-50 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1.5">Rapport analytique complet</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                Vision 360° : scopes, top postes émetteurs, comparaison annuelle, plan de réduction, trajectoires SBTi. Prêt à présenter.
              </p>
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold font-mono">PDF</span>
                <span className="text-[10px] text-gray-400 italic" title="Cette fonctionnalité sera disponible prochainement">Prochainement</span>
              </div>
            </div>
          </div>

          {/* Exports réglementaires */}
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Exports réglementaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {[
                {
                  icon: (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  ),
                  iconBg: 'bg-red-50',
                  title: 'BEGES Officiel',
                  desc: "Bilan d'Émissions de Gaz à Effet de Serre au format officiel ADEME / SINOE. Obligatoire pour les entités de +500 salariés.",
                  formats: ['PDF', 'XLSX', 'XML'],
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  ),
                  iconBg: 'bg-blue-50',
                  title: 'GHG Protocol',
                  desc: "Corporate Standard — mapping automatique Scope 1/2/3 avec distinction market-based et location-based.",
                  formats: ['PDF', 'XLSX'],
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  iconBg: 'bg-primary-50',
                  title: 'CSRD / ESRS E1',
                  desc: "Données prêtes pour le reporting CSRD conforme au standard ESRS E1 — émissions Scope 1/2/3 et intensités carbone.",
                  formats: ['XLSX', 'JSON'],
                },
              ].map(card => (
                <div
                  key={card.title}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col opacity-60 cursor-not-allowed"
                >
                  <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                    {card.icon}
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1.5">{card.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">{card.desc}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {card.formats.map(fmt => (
                        <span key={fmt} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold font-mono">
                          {fmt}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400 italic">
                      Prochainement
                    </span>
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
