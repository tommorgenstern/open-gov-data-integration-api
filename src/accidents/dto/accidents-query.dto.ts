import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Participant } from '../../statistics/dto/statistics-query.dto';

export class AccidentsQueryDto {
  @ApiPropertyOptional({ description: 'AGS-Präfix der Region (2/5/8-stellig: Land, Kreis, Gemeinde).' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  region?: string;

  @ApiPropertyOptional({ description: 'Unfalljahr.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ description: 'Monat (1–12).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Wochentag (1 = Sonntag … 7 = Samstag, wie im Unfallatlas).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekday?: number;

  @ApiPropertyOptional({ description: 'Stunde (0–23).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @ApiPropertyOptional({ description: 'Unfallkategorie: 1 = Getötete, 2 = Schwerverletzte, 3 = Leichtverletzte.' })
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

  @ApiPropertyOptional({ description: 'Max. Anzahl Ergebnisse (Standard 50).', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset für Paginierung.', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
