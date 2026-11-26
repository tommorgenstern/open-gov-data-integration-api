import { ApiProperty } from '@nestjs/swagger';

// Swagger response models for the provenance envelope returned with every data response.

export class ProvenanceSourceDto {
  @ApiProperty({ example: 'Unfallatlas (Unfallorte mit Personenschaden)' })
  name!: string;

  @ApiProperty({ example: 'https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/' })
  url!: string;

  @ApiProperty({ example: 'Datenlizenz Deutschland – Namensnennung 2.0', nullable: true })
  license!: string | null;

  @ApiProperty({ example: 'https://www.govdata.de/dl-de/by-2-0', nullable: true })
  license_url!: string | null;

  @ApiProperty({ example: '2026-06-10T13:30:00.000Z', nullable: true })
  retrieved_at!: string | null;
}

export class ProvenanceDto {
  @ApiProperty({ type: [ProvenanceSourceDto] })
  sources!: ProvenanceSourceDto[];
}

export class MetaDto {
  @ApiProperty({ type: ProvenanceDto })
  provenance!: ProvenanceDto;
}
