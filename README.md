# altopi-carbon

Plateforme SaaS de **Bilan Carbone®** pour entreprises — méthode BC2025 / ADEME.

Permet à une organisation de collecter ses données d'activité, calculer ses émissions CO₂e (Scope 1/2/3), générer un plan de réduction et exporter les résultats.

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend / API | Next.js 14 (App Router) |
| Base de données & Auth | Supabase (PostgreSQL + RLS) |
| IA — extraction documents | Mistral AI (`mistral-large-latest`, `pixtral-12b`) |
| IA — SDK installé | `@anthropic-ai/sdk` |
| Traitement fichiers | `pdf-parse`, `xlsx` |
| UI | Tailwind CSS |

---

## Fonctionnalités

### Collecte des données
- **Saisie manuelle** — formulaire avec recherche dans la Base Carbone ADEME, calcul CO₂e en temps réel, équivalences (km voiture, vols, arbres)
- **Import IA** — wizard 3 modes (document PDF/Excel/image, texte libre, vocal) : l'IA extrait automatiquement toutes les données d'activité et les mappe aux 23 postes Bilan Carbone®
- **AI Fill** — sur la saisie unitaire, uploader une facture ou dicter des instructions pour pré-remplir le formulaire

### Résultats & Analyse
- Dashboard : KPIs Scope 1/2/3, top postes émetteurs, avancement par poste
- Page Résultats : répartition visuelle, détail par poste avec barres comparatives
- Plan de réduction : actions CRUD avec gain estimé, priorité, échéance et progression

### Exports
| Format | Statut |
|---|---|
| Excel (.xlsx) | Disponible |
| CSV | Disponible |
| Rapport PDF analytique | Prochainement |
| BEGES officiel (ADEME/SINOE) | Prochainement |
| GHG Protocol Corporate Standard | Prochainement |
| CSRD / ESRS E1 | Prochainement |

### Administration
- Gestion de l'organisation (SIREN, secteur, effectif)
- Sites / établissements
- Utilisateurs et invitations (rôles : admin, project_manager, contributor, viewer, auditor)
- Paramètres du bilan (année, méthodologie, périmètre)

### Module BTP *(en développement)*
ACV chantiers intégrée au bilan carbone — Base INIES, conformité RE2020, import BIM/métrés.

---

## Installation

```bash
npm install
```

Créer un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
MISTRAL_API_KEY=<mistral_key>
```

Lancer le serveur de développement :

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Structure du projet

```
app/
├── (app)/                   # Pages authentifiées
│   ├── dashboard/           # Tableau de bord
│   ├── collecte/            # Liste des postes + données saisies
│   │   └── saisie/          # Formulaire de saisie unitaire
│   ├── resultats/           # Résultats scope 1/2/3
│   ├── plan-reduction/      # Plan de réduction IA
│   ├── exports/             # Exports & rapports
│   ├── btp/                 # Module BTP (WIP)
│   └── admin/               # Administration
├── (auth)/login/            # Page de connexion
├── api/
│   ├── import/
│   │   ├── analyze/         # POST — analyse document → N entrées IA
│   │   └── fill/            # POST — remplit formulaire unitaire IA
│   └── export/              # GET ?format=xlsx|csv
├── actions/
│   ├── activity.ts          # saveActivityData, bulkSaveActivityData, deleteActivityData
│   └── admin.ts             # Actions admin
└── auth/
    ├── callback/            # Callback OAuth Supabase
    └── invite/              # Page d'invitation

components/
├── collecte/
│   ├── SaisieForm.tsx       # Formulaire saisie + AI Fill + vocal
│   ├── ImportWizard.tsx     # Wizard import IA (document/texte/vocal)
│   ├── PostsGrid.tsx        # Grille des 23 postes BC®
│   └── DeleteEntryButton.tsx
├── plan-reduction/
│   └── PlanReductionClient.tsx
├── admin/
│   ├── BilanManager.tsx
│   ├── SitesManager.tsx
│   ├── UsersClient.tsx
│   └── InviteUserModal.tsx
└── layout/
    ├── Sidebar.tsx
    └── TopBar.tsx

lib/
├── types.ts                 # Types TypeScript (Organization, Study, ActivityData…)
└── supabase/
    ├── client.ts            # Client navigateur
    ├── server.ts            # Client serveur (cookies)
    └── admin.ts             # Client service role
```

---

## Modèle de données (tables Supabase principales)

| Table | Description |
|---|---|
| `organizations` | Organisations clientes |
| `organization_members` | Membres + rôles |
| `profiles` | Profils utilisateurs |
| `sites` | Établissements de l'organisation |
| `studies` | Bilans (1 par année par org) |
| `emission_posts` | 23 postes Bilan Carbone® (Scope 1/2/3) |
| `emission_factors` | Base Carbone ADEME |
| `activity_data` | Données saisies (quantité, unité, CO₂e calculé) |
| `reduction_actions` | Actions du plan de réduction |

---

## Méthodologies supportées

- **BC2025** — Bilan Carbone® v2025 (ADEME) *(actif)*
- BC_V8 — Bilan Carbone® v8
- GHG_PROTOCOL — GHG Protocol Corporate Standard
- ISO_14064

---

## Commandes utiles

```bash
npm run dev      # Serveur de développement (localhost:3000)
npm run build    # Build de production
npm run lint     # ESLint
```
