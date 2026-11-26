// Minimal Turtle/RDF serialization of the data sources using DCAT + Dublin Core.
// Lets /sources answer to `Accept: text/turtle` — a thin Linked-Open-Data layer
// over the provenance catalog.

interface SourceRow {
  source_id: number;
  name: string;
  url: string;
  license: string | null;
  license_url: string | null;
  format: string | null;
  retrieved_at: Date | string | null;
}

function lit(value: string): string {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

export function sourcesToTurtle(sources: SourceRow[], baseUrl: string): string {
  const lines: string[] = [
    '@prefix dcat: <http://www.w3.org/ns/dcat#> .',
    '@prefix dct:  <http://purl.org/dc/terms/> .',
    '@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .',
    '',
    `<${baseUrl}/sources> a dcat:Catalog ;`,
    `    dct:title ${lit('Unfalldaten-Integration — Datenquellen')} ;`,
    sources.length
      ? '    dcat:dataset ' + sources.map((s) => `<${baseUrl}/sources/${s.source_id}>`).join(', ') + ' .'
      : '    dct:description "Keine Quellen." .',
    '',
  ];

  for (const s of sources) {
    const parts: string[] = [
      `<${baseUrl}/sources/${s.source_id}> a dcat:Dataset ;`,
      `    dct:title ${lit(s.name)} ;`,
    ];
    if (s.license_url) parts.push(`    dct:license <${s.license_url}> ;`);
    else if (s.license) parts.push(`    dct:license ${lit(s.license)} ;`);
    if (s.retrieved_at) {
      const iso = new Date(s.retrieved_at).toISOString();
      parts.push(`    dct:modified ${lit(iso)}^^xsd:dateTime ;`);
    }
    const fmt = s.format ? `; dct:format ${lit(s.format)} ` : ' ';
    parts.push(`    dcat:distribution [ a dcat:Distribution ; dcat:accessURL <${s.url}> ${fmt}] .`);
    lines.push(parts.join('\n'), '');
  }

  return lines.join('\n');
}
