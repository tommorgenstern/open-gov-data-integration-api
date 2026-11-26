import { ApiProperty } from '@nestjs/swagger';
import { MetaDto } from '../../common/dto/provenance.dto';

export class RegionSummaryDto {
  @ApiProperty({ example: '14612' })
  ags!: string;

  @ApiProperty({ example: 'Dresden, Stadt' })
  name!: string;

  @ApiProperty({ example: 'district', enum: ['country', 'state', 'district', 'municipality'] })
  level!: string;

  @ApiProperty({ example: 563311, nullable: true })
  population!: number | null;

  @ApiProperty({ example: '14', nullable: true, description: 'AGS der übergeordneten Region.' })
  parent_ags!: string | null;
}

export class DataCoverageDto {
  @ApiProperty({ example: 2016, nullable: true })
  earliest_year!: number | null;

  @ApiProperty({ example: 2024, nullable: true })
  latest_year!: number | null;
}

export class RegionDetailDto extends RegionSummaryDto {
  @ApiProperty({ type: DataCoverageDto })
  data_coverage!: DataCoverageDto;
}

export class RegionListResponseDto {
  @ApiProperty({ type: [RegionSummaryDto] })
  data!: RegionSummaryDto[];

  @ApiProperty({ type: MetaDto })
  meta!: MetaDto;
}

export class RegionDetailResponseDto {
  @ApiProperty({ type: RegionDetailDto })
  data!: RegionDetailDto;

  @ApiProperty({ type: MetaDto })
  meta!: MetaDto;
}
