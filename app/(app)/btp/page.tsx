import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'

const features = [
  { icon: '🏛️', name: 'Base INIES', desc: '12 000+ fiches environnementales produits (FDES) pour calculer l\'impact des matériaux de construction.' },
  { icon: '🏠', name: 'Conformité RE2020', desc: 'Vérification automatique des seuils Ic Construction RE2020 par usage et par zone climatique.' },
  { icon: '📐', name: 'Import BIM & métrés', desc: 'Import des quantités depuis IFC, Revit ou un fichier Excel de métrés. Association auto aux FDES INIES.' },
]

export default function BTPPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Module BTP — Construction" subtitle="ACV chantiers · Base INIES · RE2020" />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 animate-fade-in">

          {/* Coming soon banner */}
          <div className="relative bg-gray-900 rounded-2xl px-7 py-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-4">
              🚧 Module en développement
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              ACV chantiers intégrée<br />au bilan carbone
            </h2>
            <p className="text-sm text-gray-400 max-w-lg leading-relaxed mb-5">
              Connectez le bilan carbone de votre entreprise aux émissions de vos chantiers de construction — base INIES, coefficients RE2020, import BIM/métrés. Disponible prochainement.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2.5 rounded-xl transition"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </div>

          {/* Features preview */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Fonctionnalités prévues</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map(f => (
                <div key={f.name} className="bg-white rounded-xl border border-gray-200 p-4 opacity-60">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-lg mb-3">
                    {f.icon}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1.5">{f.name}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
