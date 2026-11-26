// The 16 German federal states (Bundesländer) with their 2-digit AGS.
// Stable reference data; used to bootstrap the region hierarchy. In M2 the full
// hierarchy (districts + municipalities + population) is loaded from the
// Gemeindeverzeichnis, which also contains the states (upserted by AGS).

export interface StateSeed {
  ags: string;
  name: string;
}

export const BUNDESLAENDER: StateSeed[] = [
  { ags: '01', name: 'Schleswig-Holstein' },
  { ags: '02', name: 'Hamburg' },
  { ags: '03', name: 'Niedersachsen' },
  { ags: '04', name: 'Bremen' },
  { ags: '05', name: 'Nordrhein-Westfalen' },
  { ags: '06', name: 'Hessen' },
  { ags: '07', name: 'Rheinland-Pfalz' },
  { ags: '08', name: 'Baden-Württemberg' },
  { ags: '09', name: 'Bayern' },
  { ags: '10', name: 'Saarland' },
  { ags: '11', name: 'Berlin' },
  { ags: '12', name: 'Brandenburg' },
  { ags: '13', name: 'Mecklenburg-Vorpommern' },
  { ags: '14', name: 'Sachsen' },
  { ags: '15', name: 'Sachsen-Anhalt' },
  { ags: '16', name: 'Thüringen' },
];
