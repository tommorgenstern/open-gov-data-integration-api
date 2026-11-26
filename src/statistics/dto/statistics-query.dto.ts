import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Values that become SQL identifiers (level→prefix length, participant→column,
// sort→direction) are constrained to these enums and mapped server-side — never
// interpolated from raw input.

export enum GroupBy {
  region = 'region',
}

export enum Level {
  state = 'state',
  district = 'district',
  municipality = 'municipality',
}

export enum Participant {
  foot = 'foot',
  bike = 'bike',
  car = 'car',
  motorbike = 'motorbike',
  truck = 'truck',
  other = 'other',
}

export enum SortKey {
  countAsc = 'count',
  countDesc = '-count',
  agsAsc = 'ags',
  agsDesc = '-ags',
  rateAsc = 'rate',
  rateDesc = '-rate',
}

export enum Per {
  population = 'population', // Unfälle je 100.000 Einwohner
  pkw = 'pkw', // Unfälle je 100.000 zugelassene PKW (Kreisebene)
}

export class StatisticsQueryDto {
  @ApiPropertyOptional({
    enum: GroupBy,
    default: GroupBy.region,
    description: 'Gruppierungsdimension der Aggregation.',
  })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy: GroupBy = GroupBy.region;

  @ApiProperty({
    enum: Level,
    description: 'Regionsebene: Bundesland (state), Landkreis (district) oder Gemeinde (municipality).',
  })
  @IsEnum(Level)
  level!: Level;

  @ApiPropertyOptional({
    description: 'AGS-Präfix der übergeordneten Region (z. B. 14 = nur Regionen in Sachsen).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  parent?: string;

  @ApiPropertyOptional({ description: 'Unfalljahr, z. B. 2023.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Unfallkategorie: 1 = Getötete, 2 = Schwerverletzte, 3 = Leichtverletzte.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  category?: number;

  @ApiPropertyOptional({ enum: Participant, description: 'Filter auf Beteiligtenart.' })
  @IsOptional()
  @IsEnum(Participant)
  participant?: Participant;

  @ApiPropertyOptional({
    enum: Per,
    description:
      'Bezugsgröße für eine Rate je 100.000: population (Einwohner) oder pkw ' +
      '(zugelassene PKW; nur auf Kreisebene mit Jahr).',
  })
  @IsOptional()
  @IsEnum(Per)
  per?: Per;

  @ApiPropertyOptional({
    enum: SortKey,
    default: SortKey.countDesc,
    description: 'Sortierung der Ergebnisse (z. B. -count für Ranglisten, -rate für höchste Rate).',
  })
  @IsOptional()
  @IsEnum(SortKey)
  sort: SortKey = SortKey.countDesc;

  @ApiPropertyOptional({ description: 'Maximale Anzahl Ergebniszeilen (z. B. 5 für Top-Ranglisten).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset für Paginierung (Standard 0).', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Nur Regionen mit mindestens dieser Unfallzahl.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minCount?: number;

  @ApiPropertyOptional({
    description: 'Nur Regionen mit höchstens dieser Unfallzahl (maxCount=0 ⇒ Regionen ohne Unfälle).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCount?: number;
}
