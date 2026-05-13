import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
  const orgId = membership.organization_id

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const { data: study } = await supabase
    .from('studies')
    .select('id, name, reference_year, methodology')
    .eq('organization_id', orgId)
    .order('reference_year', { ascending: false })
    .limit(1)
    .single()

  if (!study) return NextResponse.json({ error: 'Aucun bilan trouvé' }, { status: 404 })

  const { data: rows } = await supabase
    .from('activity_data')
    .select(`
      id,
      description,
      quantity,
      unit,
      co2e_calculated,
      created_at,
      emission_posts(name, scope, order_index),
      sites(name),
      emission_factors(name, co2e_value, unit)
    `)
    .eq('study_id', study.id)
    .order('created_at', { ascending: true })

  const entries = (rows ?? []).map(row => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = row.emission_posts as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const site = row.sites as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ef = row.emission_factors as any
    return {
      poste: post?.name ?? '',
      scope: post?.scope ? `Scope ${post.scope}` : '',
      description: row.description ?? '',
      site: site?.name ?? '',
      quantite: row.quantity ?? 0,
      unite: row.unit ?? '',
      facteur_emission: ef?.name ?? '',
      kgco2e: row.co2e_calculated ?? 0,
      tco2e: (row.co2e_calculated ?? 0) / 1000,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '',
    }
  })

  let scope1Total = 0
  let scope2Total = 0
  let scope3Total = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (rows ?? []) as any[]) {
    const scope = row.emission_posts?.scope ? String(row.emission_posts.scope) : '3'
    const tonne = (row.co2e_calculated ?? 0) / 1000
    if (scope === '1') scope1Total += tonne
    else if (scope === '2') scope2Total += tonne
    else scope3Total += tonne
  }
  const totalCo2eTonne = scope1Total + scope2Total + scope3Total

  const format = req.nextUrl.searchParams.get('format') ?? 'json'

  if (format === 'csv') {
    const headers = ['Poste', 'Scope', 'Description', 'Site', 'Quantité', 'Unité', 'Facteur d\'émission', 'kgCO2e', 'tCO2e', 'Date']
    const csvRows = [
      headers.join(','),
      ...entries.map(e =>
        [
          `"${e.poste.replace(/"/g, '""')}"`,
          `"${e.scope}"`,
          `"${e.description.replace(/"/g, '""')}"`,
          `"${e.site.replace(/"/g, '""')}"`,
          e.quantite,
          `"${e.unite}"`,
          `"${e.facteur_emission.replace(/"/g, '""')}"`,
          e.kgco2e.toFixed(3),
          e.tco2e.toFixed(6),
          `"${e.date}"`,
        ].join(',')
      ),
    ].join('\r\n')

    return new NextResponse(csvRows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="altopi-carbon-bilan-${study.reference_year}.csv"`,
      },
    })
  }

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()

    const summaryData = [
      ['Organisation', org?.name ?? ''],
      ['Année du bilan', study.reference_year],
      ['Nom du bilan', study.name],
      ['Méthodologie', study.methodology],
      ['', ''],
      ['Total CO₂e (tCO₂e)', totalCo2eTonne.toFixed(3)],
      ['Scope 1 (tCO₂e)', scope1Total.toFixed(3)],
      ['Scope 2 (tCO₂e)', scope2Total.toFixed(3)],
      ['Scope 3 (tCO₂e)', scope3Total.toFixed(3)],
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé')

    const dataRows = [
      ['Poste', 'Scope', 'Description', 'Site', 'Quantité', 'Unité', 'Facteur d\'émission', 'kgCO2e', 'tCO2e', 'Date'],
      ...entries.map(e => [
        e.poste,
        e.scope,
        e.description,
        e.site,
        e.quantite,
        e.unite,
        e.facteur_emission,
        e.kgco2e,
        e.tco2e,
        e.date,
      ]),
    ]
    const wsData = XLSX.utils.aoa_to_sheet(dataRows)
    XLSX.utils.book_append_sheet(wb, wsData, 'Données')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="altopi-carbon-bilan-${study.reference_year}.xlsx"`,
      },
    })
  }

  return NextResponse.json({
    study: {
      id: study.id,
      name: study.name,
      reference_year: study.reference_year,
      methodology: study.methodology,
    },
    total_co2e_tonne: totalCo2eTonne,
    scope_totals: {
      1: scope1Total,
      2: scope2Total,
      3: scope3Total,
    },
    entries,
  })
}
