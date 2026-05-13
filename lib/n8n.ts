export async function triggerN8nWebhook(event: string, payload: Record<string, unknown>) {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }),
    })
  } catch {
    // Non-blocking — n8n webhook failure must never break the main flow
  }
}

export function checkN8nKey(req: Request) {
  const key = req.headers.get('x-n8n-key')
  return !!process.env.N8N_API_KEY && key === process.env.N8N_API_KEY
}
