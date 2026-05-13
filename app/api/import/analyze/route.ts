import { Mistral } from '@mistralai/mistralai'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

type EmissionPost = {
  id: string
  name: string
  scope: string
  order_index: number
  category: string | null
  description: string | null
}

function buildSystemPrompt(posts: EmissionPost[]) {
  const list = posts
    .map(p => `• [${p.id}] P${p.order_index} – ${p.name} (Scope ${p.scope})${p.category ? ` / ${p.category}` : ''}`)
    .join('\n')

  return `Tu es un expert en comptabilité carbone utilisant la méthode Bilan Carbone® (BC2025) et les facteurs ADEME Base Carbone.

Analyse le contenu fourni et extrait TOUTES les données d'activité pouvant générer des émissions de gaz à effet de serre.

Postes d'émission disponibles (ID | Numéro – Nom):
${list}

Pour chaque donnée identifiée:
1. Mappe-la au poste le plus approprié parmi la liste ci-dessus
2. Extrais la quantité numérique et son unité
3. Si tu connais le facteur d'émission ADEME correspondant, estime le CO₂e en kg

Réponds UNIQUEMENT avec ce JSON strict (sans markdown, sans texte avant ou après):
{"entries":[{"post_id":"UUID_EXACT","description":"Description courte fr","quantity":0.0,"unit":"kWh","co2e_kgCO2e":null,"factor_hint":"Nom facteur ADEME"}]}`
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // ── Delegate to n8n if configured ────────────────────────────────────────
  const n8nUrl = process.env.N8N_ANALYZE_WEBHOOK
  if (n8nUrl) {
    const formData = await req.formData()
    // Forward raw formData to n8n — it handles Mistral + validation
    const fwd = new FormData()
    const file = formData.get('file') as File | null
    const content = formData.get('content') as string | null
    if (file) fwd.append('file', file)
    if (content) fwd.append('content', content)
    fwd.append('user_id', user.id)

    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'x-n8n-key': process.env.N8N_API_KEY ?? '' },
      body: fwd,
    })
    if (!n8nRes.ok) {
      const err = await n8nRes.json().catch(() => ({}))
      return Response.json({ error: err.error ?? 'Erreur n8n' }, { status: n8nRes.status })
    }
    return Response.json(await n8nRes.json())
  }

  // ── Direct Mistral fallback ───────────────────────────────────────────────
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) return Response.json({ error: 'MISTRAL_API_KEY non configurée' }, { status: 500 })

  const { data: posts } = await supabase
    .from('emission_posts')
    .select('id, name, scope, order_index, category, description')
    .order('order_index')

  const formData = await req.formData()
  const type = formData.get('type') as string

  const client = new Mistral({ apiKey })
  type MistralContent = { type: 'text'; text: string } | { type: 'image_url'; imageUrl: { url: string } }
  let messageContent: string | MistralContent[]
  let model = 'mistral-large-latest'

  if (type === 'text') {
    const content = formData.get('content') as string
    if (!content?.trim()) return Response.json({ error: 'Contenu vide' }, { status: 400 })
    messageContent = `${buildSystemPrompt(posts ?? [])}\n\nContenu à analyser:\n---\n${content}\n---`
  } else {
    const file = formData.get('file') as File
    if (!file) return Response.json({ error: 'Fichier manquant' }, { status: 400 })
    if (file.size > 14 * 1024 * 1024) return Response.json({ error: 'Fichier trop volumineux (max 14 Mo)' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

    if (ext === 'pdf') {
      const data = await pdfParse(buffer)
      const text = (data.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 12000)
      if (!text) return Response.json({ error: 'PDF non lisible — essayez JPG/PNG' }, { status: 422 })
      messageContent = `${buildSystemPrompt(posts ?? [])}\n\nContenu PDF:\n---\n${text}\n---`
    } else if (['xlsx', 'xls', 'ods'].includes(ext)) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheets = wb.SheetNames.map(n => `=== ${n} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n')
      const content = sheets.replace(/,+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 12000)
      messageContent = `${buildSystemPrompt(posts ?? [])}\n\nContenu Excel:\n---\n${content}\n---`
    } else if (['csv', 'txt'].includes(ext)) {
      let text = buffer.toString('utf-8')
      if (text.includes('�')) text = buffer.toString('latin1')
      messageContent = `${buildSystemPrompt(posts ?? [])}\n\nContenu:\n---\n${text.slice(0, 12000)}\n---`
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
      const base64 = buffer.toString('base64')
      model = 'pixtral-12b-2409'
      messageContent = [
        { type: 'image_url', imageUrl: { url: `data:${mimeMap[ext] ?? 'image/jpeg'};base64,${base64}` } },
        { type: 'text', text: buildSystemPrompt(posts ?? []) },
      ]
    } else {
      return Response.json({ error: `Format non supporté : .${ext}` }, { status: 400 })
    }
  }

  try {
    const response = await client.chat.complete({ model, messages: [{ role: 'user', content: messageContent }] })
    const raw = response.choices?.[0]?.message?.content
    const text = typeof raw === 'string' ? raw.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] ?? '{"entries":[]}')

    const validIds = new Set((posts ?? []).map(p => p.id))
    const postMap = Object.fromEntries((posts ?? []).map(p => [p.id, p]))

    const validated = (parsed.entries ?? [])
      .filter((e: { post_id: string }) => validIds.has(e.post_id))
      .map((e: { post_id: string; description: string; quantity: number; unit: string; co2e_kgCO2e: number | null; factor_hint: string | null }) => ({
        ...e,
        post_name: postMap[e.post_id]?.name ?? '',
        post_scope: postMap[e.post_id]?.scope ?? '3',
      }))

    return Response.json({ entries: validated })
  } catch (err) {
    console.error('[import/analyze]', err)
    return Response.json({ error: 'Erreur IA — vérifiez votre clé Mistral' }, { status: 500 })
  }
}
