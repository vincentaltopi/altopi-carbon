import { Mistral } from '@mistralai/mistralai'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

const VALID_UNITS = ['kWh', 'MWh', 'GJ', 'm³', 'L', 'tonne', 'kg', 'km', 'passager.km', 'tonne.km', 'unité', 'heure']

function getValidPeriods(year: number) {
  return [
    `Année ${year} complète`,
    `T1 ${year} (Jan-Mar)`,
    `T2 ${year} (Avr-Jun)`,
    `T3 ${year} (Jul-Sep)`,
    `T4 ${year} (Oct-Déc)`,
  ]
}

function buildPrompt(postName: string, postScope: string, postDesc: string, instructions: string, content: string, year: number) {
  const validPeriods = getValidPeriods(year)
  return `Tu es un expert en comptabilité carbone (méthode Bilan Carbone® BC2025 / ADEME).

Poste cible : ${postName} (Scope ${postScope})${postDesc ? `\nDescription : ${postDesc}` : ''}
${instructions ? `\nInstructions : ${instructions}` : ''}

Contenu du document :
---
${content}
---

Extrais les informations pertinentes pour CE poste uniquement.
Réponds UNIQUEMENT avec ce JSON strict (sans markdown, sans texte avant/après) :
{
  "description": "Description courte et précise",
  "quantity": 0.0,
  "unit": "kWh",
  "period": "${validPeriods[0]}",
  "factor_query": "mots-clés recherche ADEME"
}

Contraintes :
- unit : EXACTEMENT une de ces valeurs : ${VALID_UNITS.join(', ')}
- period : EXACTEMENT une de ces valeurs : ${validPeriods.join(' | ')}
- quantity : nombre décimal positif uniquement
- description : max 120 caractères, factuelle
- factor_query : 2-5 mots-clés pour chercher le bon facteur d'émission ADEME`
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'MISTRAL_API_KEY non configurée dans .env.local' }, { status: 500 })
  }

  const formData = await req.formData()
  const postName = (formData.get('post_name') as string) ?? ''
  const postScope = (formData.get('post_scope') as string) ?? '3'
  const postDesc = (formData.get('post_desc') as string) ?? ''
  const instructions = (formData.get('instructions') as string) ?? ''
  const file = formData.get('file') as File | null
  const yearParam = parseInt(formData.get('study_year') as string)
  const year = isNaN(yearParam) ? new Date().getFullYear() : yearParam
  const validPeriods = getValidPeriods(year)

  const client = new Mistral({ apiKey })

  type MistralContent = { type: 'text'; text: string } | { type: 'image_url'; imageUrl: { url: string } }
  let messageContent: string | MistralContent[]

  if (file) {
    if (file.size > 14 * 1024 * 1024) {
      return Response.json({ error: 'Fichier trop volumineux (max 14 Mo)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

    if (ext === 'pdf') {
      const data = await pdfParse(buffer)
      const text = (data.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 10000)
      if (!text) {
        return Response.json({ error: 'PDF non lisible — le document est scanné ou protégé. Exportez en Excel/CSV ou prenez une photo (JPG/PNG).' }, { status: 422 })
      }
      messageContent = buildPrompt(postName, postScope, postDesc, instructions, text, year)
    } else if (['xlsx', 'xls', 'ods'].includes(ext)) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheets = wb.SheetNames.map(n => `=== ${n} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n')
      const content = sheets.replace(/,+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 10000)
      messageContent = buildPrompt(postName, postScope, postDesc, instructions, content, year)
    } else if (['csv', 'txt'].includes(ext)) {
      // Try UTF-8 first, fallback to latin-1 for Windows/Excel exports
      let text = buffer.toString('utf-8')
      if (text.includes('�')) text = buffer.toString('latin1')
      messageContent = buildPrompt(postName, postScope, postDesc, instructions, text.slice(0, 10000), year)
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
      const base64 = buffer.toString('base64')
      const mime = mimeMap[ext] ?? 'image/jpeg'
      messageContent = [
        {
          type: 'image_url',
          imageUrl: { url: `data:${mime};base64,${base64}` },
        },
        {
          type: 'text',
          text: buildPrompt(postName, postScope, postDesc, instructions, '(voir image ci-dessus)', year),
        },
      ]
    } else {
      return Response.json({ error: `Format non supporté : .${ext} — utilisez PDF, Excel (.xlsx), CSV ou image (JPG/PNG)` }, { status: 400 })
    }
  } else if (instructions.trim()) {
    messageContent = buildPrompt(postName, postScope, postDesc, instructions, instructions, year)
  } else {
    return Response.json({ error: 'Fournissez un fichier ou des instructions' }, { status: 400 })
  }

  try {
    const model = Array.isArray(messageContent) ? 'pixtral-12b-2409' : 'mistral-large-latest'

    const response = await client.chat.complete({
      model,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    })

    const raw = response.choices?.[0]?.message?.content
    const text = typeof raw === 'string' ? raw.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] ?? '{}')

    const result = {
      description: String(parsed.description ?? '').slice(0, 120),
      quantity: Number(parsed.quantity) || 0,
      unit: VALID_UNITS.includes(parsed.unit) ? parsed.unit : 'kWh',
      period: validPeriods.includes(parsed.period) ? parsed.period : validPeriods[0],
      factor_query: String(parsed.factor_query ?? '').slice(0, 80),
    }

    return Response.json(result)
  } catch (err) {
    console.error('[import/fill]', err)
    return Response.json({ error: 'Erreur lors de l\'analyse IA — vérifiez votre clé Mistral' }, { status: 500 })
  }
}
