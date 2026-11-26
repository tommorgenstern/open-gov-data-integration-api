import { DocumentBuilder } from '@nestjs/swagger';

// Shared OpenAPI definition, used by the running server (/docs) and by the
// offline export script (npm run openapi:export → openapi.json).
export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Unfalldaten-API')
    .setDescription(
      [
        'Web-Service-API für integrierte deutsche Unfalldaten (Unfallatlas, Gemeindeverzeichnis, KBA FZ1).',
        '',
        '## Regionsschlüssel (AGS)',
        'Regionen werden über den **Amtlichen Gemeindeschlüssel (AGS)** als Zeichenkette adressiert:',
        '- `level=state` → 2-stellig (Bundesland, z. B. `14` = Sachsen, `05` = NRW)',
        '- `level=district` → 5-stellig (Landkreis/kreisfreie Stadt, z. B. `14612` = Dresden)',
        '- `level=municipality` → 8-stellig (Gemeinde)',
        'Aufbau: `Land(2) + Regierungsbezirk(1) + Kreis(2) + Gemeinde(3)`. Aggregationen nutzen den',
        'AGS-Präfix; `00` ist die synthetische Wurzel „Deutschland“ (Gesamtabdeckung).',
        '',
        '## Herkunft & Lizenz (Provenienz)',
        'Jede Datenantwort ist in eine Hülle `{ data, meta }` verpackt. `meta.provenance.sources` ist',
        'ein Array — je beitragender Quelle Name, URL, Lizenz (Name + Link) und Abrufdatum.',
        '',
        '## Fehlercodes',
        '`400` ungültige Parameter · `404` unbekannte Ressource · `422` unzulässige Kombination',
        '(z. B. `per=pkw` außerhalb der Kreisebene) · `503` Datenbank nicht erreichbar.',
        '',
        '## Linked Data',
        '`GET /sources` liefert mit `Accept: text/turtle` den Quellenkatalog als RDF (DCAT + Dublin Core).',
      ].join('\n'),
    )
    .setVersion('1.0')
    .build();
}
