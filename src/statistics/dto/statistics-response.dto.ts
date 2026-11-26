import { ApiProperty } from '@nestjs/swagger';
import { MetaDto } from '../../common/dto/provenance.dto';

export class RegionStatDto {
  @ApiProperty({ example: '14', description: 'AGS der Region.' })
  ags!: string;

  @ApiProperty({ example: 'Sachsen' })
  name!: string;

  @ApiProperty({ example: 12513, description: 'Anzahl Unfälle.' })
  count!: number;

  @ApiProperty({ example: 102139, nullable: true, required: false, description: 'Bezugsgröße der Rate (nur bei per).' })
  denominator?: number | null;

  @ApiProperty({ example: 1159.2, nullable: true, required: false, description: 'Rate je 100.000 (nur bei per).' })
  rate?: number | null;
}

export class StatisticsResponseDto {
  @ApiProperty({ type: [RegionStatDto] })
  data!: RegionStatDto[];

  @ApiProperty({ type: MetaDto })
  meta!: MetaDto;
}
