import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { envelope, fetchSources, SOURCE } from '../common/provenance';
import { Per, StatisticsQueryDto } from './dto/statistics-query.dto';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { StatisticsService } from './statistics.service';

@ApiTags('Statistik')
@Controller('accident-statistics')
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Aggregierte Unfallzahlen je Region',
    description:
      'Liefert Unfallzahlen je Region auf der gewählten Ebene. Über Parameter lassen sich ' +
      'Ranglisten (sort, limit), Filter (year, category, participant) und Regionen ohne Unfälle ' +
      '(maxCount=0) abbilden. Die Antwort enthält die Herkunfts- und Lizenzangaben der Quellen.',
  })
  @ApiOkResponse({ type: StatisticsResponseDto })
  @ApiBadRequestResponse({ description: 'Ungültige Parameter.' })
  @ApiUnprocessableEntityResponse({ description: 'Unzulässige Kombination (z. B. per=pkw außerhalb der Kreisebene).' })
  async getStatistics(@Query() query: StatisticsQueryDto) {
    const data = await this.service.regionStatistics(query);
    // Counts derive from the Unfallatlas + region reference (GV); PKW rates add KBA.
    const names = [SOURCE.unfallatlas, SOURCE.gemeindeverzeichnis];
    if (query.per === Per.pkw) names.push(SOURCE.kba);
    const sources = await fetchSources(names);
    return envelope(data, sources);
  }
}
