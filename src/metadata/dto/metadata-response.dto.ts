import { ApiProperty } from '@nestjs/swagger';

export class SourceDto {
  @ApiProperty({ example: 1 })
  source_id!: number;

  @ApiProperty({ example: 'Unfallatlas (Unfallorte mit Personenschaden)' })
  name!: string;

  @ApiProperty({ example: 'https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/' })
  url!: string;

  @ApiProperty({ example: 'Datenlizenz Deutschland – Namensnennung 2.0', nullable: true })
  license!: string | null;

  @ApiProperty({ example: 'https://www.govdata.de/dl-de/by-2-0', nullable: true })
  license_url!: string | null;

  @ApiProperty({ example: 'CSV', nullable: true })
  format!: string | null;

  @ApiProperty({ example: '2026-06-10T13:30:00.000Z', nullable: true })
  retrieved_at!: string | null;
}

export class ImportRunDto {
  @ApiProperty({ example: 5 })
  import_run_id!: number;

  @ApiProperty({ example: 1 })
  source_id!: number;

  @ApiProperty({ example: 'Unfallatlas (Unfallorte mit Personenschaden)' })
  source_name!: string;

  @ApiProperty({ example: 'https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/' })
  source_url!: string;

  @ApiProperty({ example: 'Datenlizenz Deutschland – Namensnennung 2.0', nullable: true })
  license!: string | null;

  @ApiProperty({ example: 'https://www.govdata.de/dl-de/by-2-0', nullable: true })
  license_url!: string | null;

  @ApiProperty({ example: 'unfallatlas:2023' })
  dataset_key!: string;

  @ApiProperty({ example: '2026-06-25T20:50:00.000Z' })
  started_at!: string;

  @ApiProperty({ example: '2026-06-25T20:50:12.000Z', nullable: true })
  finished_at!: string | null;

  @ApiProperty({ example: 269048, nullable: true })
  rows_in!: number | null;

  @ApiProperty({ example: 269048, nullable: true })
  rows_loaded!: number | null;

  @ApiProperty({ example: 0, nullable: true })
  rows_rejected!: number | null;

  @ApiProperty({ example: 'Unfallatlas 2023; orphan AGS (unresolved region): 0', nullable: true })
  notes!: string | null;
}
