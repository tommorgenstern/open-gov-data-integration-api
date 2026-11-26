import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { envelope, fetchSources, SOURCE } from '../common/provenance';
import { AccidentsQueryDto } from './dto/accidents-query.dto';
import { AccidentsResponseDto } from './dto/accidents-response.dto';
import { AccidentsService } from './accidents.service';

@ApiTags('Unfälle')
@Controller('accidents')
export class AccidentsController {
  constructor(private readonly service: AccidentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Einzelne Unfälle (gefiltert)',
    description:
      'Liefert einzelne Unfallereignisse mit Filtern (Region, Jahr, Monat, Wochentag, Stunde, ' +
      'Kategorie, Beteiligtenart) und Paginierung.',
  })
  @ApiOkResponse({ type: AccidentsResponseDto })
  async list(@Query() query: AccidentsQueryDto) {
    const data = await this.service.list(query);
    const sources = await fetchSources([SOURCE.unfallatlas, SOURCE.gemeindeverzeichnis]);
    return envelope(data, sources);
  }
}
