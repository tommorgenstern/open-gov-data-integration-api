import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { envelope, fetchSources, SOURCE } from '../common/provenance';
import { RegionsQueryDto } from './dto/regions-query.dto';
import { RegionDetailResponseDto, RegionListResponseDto } from './dto/regions-response.dto';
import { RegionsService } from './regions.service';

@ApiTags('Regionen')
@Controller('regions')
export class RegionsController {
  constructor(private readonly service: RegionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Regionen auflisten',
    description: 'Listet Regionen (Land, Bundesland, Kreis, Gemeinde) mit Filter und Paginierung.',
  })
  @ApiOkResponse({ type: RegionListResponseDto })
  async list(@Query() query: RegionsQueryDto) {
    const data = await this.service.list(query);
    const sources = await fetchSources([SOURCE.gemeindeverzeichnis]);
    return envelope(data, sources);
  }

  @Get(':ags')
  @ApiOperation({
    summary: 'Einzelne Region',
    description:
      'Liefert eine Region inkl. Einwohnerzahl und data_coverage (frühestes/spätestes Unfalljahr). ' +
      'AGS „00“ steht für Deutschland gesamt (frühestes Jahr insgesamt).',
  })
  @ApiParam({ name: 'ags', description: 'Amtlicher Gemeindeschlüssel, z. B. 14 (Sachsen), 05 (NRW), 00 (Deutschland).' })
  @ApiOkResponse({ type: RegionDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Keine Region mit diesem AGS gefunden.' })
  async getOne(@Param('ags') ags: string) {
    const region = await this.service.getByAgs(ags);
    if (!region) {
      throw new NotFoundException(`Keine Region mit AGS „${ags}“ gefunden.`);
    }
    const sources = await fetchSources([SOURCE.gemeindeverzeichnis, SOURCE.unfallatlas]);
    return envelope(region, sources);
  }
}
