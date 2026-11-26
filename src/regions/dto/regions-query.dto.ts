import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum RegionLevelFilter {
  country = 'country',
  state = 'state',
  district = 'district',
  municipality = 'municipality',
}

export class RegionsQueryDto {
  @ApiPropertyOptional({
    enum: RegionLevelFilter,
    description: 'Filter auf die Regionsebene.',
  })
  @IsOptional()
  @IsEnum(RegionLevelFilter)
  level?: RegionLevelFilter;

  @ApiPropertyOptional({ description: 'AGS der übergeordneten Region (z. B. 14 für Kreise in Sachsen).' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  parent?: string;

  @ApiPropertyOptional({ description: 'Freitextsuche im Regionsnamen.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Max. Anzahl Ergebnisse (Standard 100).', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset für Paginierung.', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
