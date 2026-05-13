# n8n Setup — Altopi Carbon

## Variables d'environnement à configurer dans n8n

Aller dans **Settings → Environment Variables** dans votre instance n8n :

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | URL de votre projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon (publique) Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service_role Supabase (secrète) |
| `MISTRAL_API_KEY` | Clé API Mistral AI |
| `N8N_API_KEY` | Clé secrète partagée entre Next.js et n8n |
| `APP_URL` | `https://altopi-carbon.vercel.app` |

## Variables à ajouter dans Vercel (Next.js)

| Variable | Description |
|---|---|
| `N8N_API_KEY` | Même valeur que dans n8n |
| `N8N_ANALYZE_WEBHOOK` | URL du webhook 01 (ex: `https://n8n.srv1024763.hstgr.cloud/webhook/altopi-analyze`) |
| `N8N_FILL_WEBHOOK` | URL du webhook 02 (ex: `https://n8n.srv1024763.hstgr.cloud/webhook/altopi-fill`) |

## Import des workflows

1. Ouvrir votre instance n8n : https://n8n.srv1024763.hstgr.cloud
2. Cliquer sur **+ New Workflow** → **Import from file**
3. Importer dans cet ordre :
   - `01-analyse-ia.json` — Analyse IA documents (webhook)
   - `02-fill-poste.json` — Remplissage automatique d'un poste (webhook)
   - `03-email-inbox.json` — Import automatique par email (IMAP)
   - `04-weekly-reminder.json` — Rappel hebdomadaire (lundi 9h)
   - `05-monthly-report.json` — Rapport mensuel (1er du mois 8h)

## Credentials à créer dans n8n

### SMTP (pour envoi d'emails)
- **Type** : SMTP
- Utiliser votre compte email `bilan@altopi.eco`
- Puis mettre à jour l'ID dans les workflows 03, 04, 05 : remplacer `SMTP_CRED_ID` par votre vrai ID

### IMAP (pour réception d'emails — workflow 03)
- **Type** : IMAP Email
- Même compte `bilan@altopi.eco`
- Puis mettre à jour `IMAP_CRED_ID` dans le workflow 03

## Fonctionnement

### Workflow 01 — Analyse IA Documents
- Appelé automatiquement par Next.js quand `N8N_ANALYZE_WEBHOOK` est défini
- Reçoit un fichier (PDF, Excel, CSV, image) ou du texte
- Appelle Mistral AI pour extraire les données carbone
- Retourne les entrées structurées à l'application

### Workflow 02 — Fill Poste IA
- Appelé automatiquement par Next.js quand `N8N_FILL_WEBHOOK` est défini
- Remplit automatiquement un poste spécifique à partir d'un document
- Utilise Pixtral pour les images, mistral-large pour les textes

### Workflow 03 — Email Auto-Import
- Se déclenche à chaque email reçu sur la boîte IMAP
- Analyse le texte de l'email avec Mistral AI
- Insère les données comme `pending_review` dans Supabase
- Envoie un email de confirmation à l'expéditeur
- Les données apparaissent dans la page *Validation IA* de l'application

### Workflow 04 — Rappel Hebdomadaire
- Chaque lundi à 9h
- Calcule le % de complétion de chaque organisation
- Envoie un email personnalisé aux contributeurs des bilans incomplets
- Liste les 5 postes vides les plus urgents

### Workflow 05 — Rapport Mensuel
- Le 1er de chaque mois à 8h
- Envoie un rapport HTML complet aux admins de chaque organisation
- Breakdown CO₂ par scope (1, 2, 3)
- Liens vers collecte, validation et résultats
