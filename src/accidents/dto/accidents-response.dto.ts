import { ApiProperty } from '@nestjs/swagger';
import { MetaDto } from '../../common/dto/provenance.dto';

export class AccidentDto {
  @ApiProperty({ example: 123456 })
  accident_id!: number;

  @ApiProperty({ example: 2023 })
  year!: number;

  @ApiProperty({ example: 7, nullable: true })
  month!: number | null;

  @ApiProperty({ example: 17, nullable: true })
  hour!: number | null;

  @ApiProperty({ example: 6, nullable: true, description: 'Wochentag (1=So … 7=Sa).' })
  weekday!: number | null;

  @ApiProperty({ example: 3, nullable: true, description: '1=Getötete, 2=Schwerverletzte, 3=Leichtverletzte.' })
  category!: number | null;

  @ApiProperty({ example: 2, nullable: true, description: 'Unfallart (UART).' })
  type!: number | null;

  @ApiProperty({ example: 0, nullable: true, description: 'Lichtverhältnisse (ULICHTVERH).' })
  light!: number | null;

  @ApiProperty({ example: false, nullable: true })
  is_bike!: boolean | null;

  @ApiProperty({ example: true, nullable: true })
  is_car!: boolean | null;

  @ApiProperty({ example: false, nullable: true })
  is_foot!: boolean | null;

  @ApiProperty({ example: false, nullable: true })
  is_motorbike!: boolean | null;

  @ApiProperty({ example: false, nullable: true })
  is_truck!: boolean | null;

  @ApiProperty({ example: false, nullable: true })
  is_other!: boolean | null;

  @ApiProperty({ example: 13.7373, nullable: true })
  lon!: number | null;

  @ApiProperty({ example: 51.0504, nullable: true })
  lat!: number | null;

  @ApiProperty({ example: '14612000' })
  region_ags!: string;

  @ApiProperty({ example: 'Dresden, Stadt' })
  region_name!: string;
}

export class AccidentsResponseDto {
  @ApiProperty({ type: [AccidentDto] })
  data!: AccidentDto[];

  @ApiProperty({ type: MetaDto })
  meta!: MetaDto;
}
