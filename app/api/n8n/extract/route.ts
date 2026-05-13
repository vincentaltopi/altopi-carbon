import { checkN8nKey } from '@/lib/n8n'
import * as XLSX from 'xlsx'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

// Called by n8n to extract text from file attachments
export async function POST(req: Request) {
  if (!checkN8nKey(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 14 * 1024 * 1024) return Response.json({ error: 'File too large (max 14MB)' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  try {
    let text = ''
    let fileType = 'text'

    if (ext === 'pdf') {
      const data = await pdfParse(buffer)
      text = (data.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 12000)
      if (!text) return Response.json({ error: 'PDF is scanned or protected — use JPG/PNG instead' }, { status: 422 })
      fileType = 'pdf'
    } else if (['xlsx', 'xls', 'ods'].includes(ext)) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheets = wb.SheetNames.map(n => `=== ${n} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n')
      text = sheets.replace(/,+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 12000)
      fileType = 'excel'
    } else if (['csv', 'txt'].includes(ext)) {
      text = buffer.toString('utf-8')
      if (text.includes('�')) text = buffer.toString('latin1')
      text = text.slice(0, 12000)
      fileType = 'csv'
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
      return Response.json({
        fileType: 'image',
        base64: buffer.toString('base64'),
        mimeType: mimeMap[ext] ?? 'image/jpeg',
        fileName: file.name,
      })
    } else {
      return Response.json({ error: `Unsupported format: .${ext}` }, { status: 400 })
    }

    return Response.json({ fileType, text, fileName: file.name })
  } catch (err) {
    console.error('[n8n/extract]', err)
    return Response.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
