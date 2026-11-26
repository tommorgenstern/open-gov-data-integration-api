import { Controller, Get, Headers, NotFoundException, Param, ParseIntPipe, Req, Res } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ImportRunDto, SourceDto } from './dto/metadata-response.dto';
import { MetadataService } from './metadata.service';
import { sourcesToTurtle } from './rdf';

const TURTLE_RE = /text\/turtle|application\/(x-)?turtle|text\/n3/i;

@ApiTags('Metadaten & Herkunft')
@Controller()
export class MetadataController {
  constructor(private readonly service: MetadataService) {}

  @Get('sources')
  @ApiOperation({
    summary: 'Datenquellen',
    description:
      'Alle integrierten Datenquellen mit Lizenz, URL und Abrufdatum. Mit ' +
      '`Accept: text/turtle` wird der Katalog als Linked Data (DCAT + Dublin Core, RDF/Turtle) ausgegeben.',
  })
  @ApiProduces('application/json', 'text/turtle')
  @ApiOkResponse({ type: [SourceDto] })
  async listSources(
    @Headers('accept') accept: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sources = await this.service.listSources();
    if (accept && TURTLE_RE.test(accept)) {
      res.type('text/turtle');
      const base = `${req.protocol}://${req.get('host')}`;
      return sourcesToTurtle(sources, base);
    }
    return sources;
  }

  @Get('sources/:id')
  @ApiOperation({ summary: 'Einzelne Datenquelle' })
  @ApiOkResponse({ type: SourceDto })
  @ApiNotFoundResponse({ description: 'Keine Datenquelle mit dieser ID.' })
  async getSource(@Param('id', ParseIntPipe) id: number) {
    const source = await this.service.getSource(id);
    if (!source) throw new NotFoundException(`Keine Datenquelle mit ID ${id} gefunden.`);
    return source;
  }

  @Get('import-runs')
  @ApiOperation({
    summary: 'Importläufe',
    description:
      'Provenienz der ETL-Läufe: je Datensatz Zeilenzahlen (gelesen/geladen/abgelehnt), ' +
      'Zeitstempel und Hinweise. Belegt die Reproduzierbarkeit und das Update-Verhalten.',
  })
  @ApiOkResponse({ type: [ImportRunDto] })
  listImportRuns() {
    return this.service.listImportRuns();
  }

  @Get('import-runs/:id')
  @ApiOperation({ summary: 'Einzelner Importlauf' })
  @ApiOkResponse({ type: ImportRunDto })
  @ApiNotFoundResponse({ description: 'Kein Importlauf mit dieser ID.' })
  async getImportRun(@Param('id', ParseIntPipe) id: number) {
    const run = await this.service.getImportRun(id);
    if (!run) throw new NotFoundException(`Kein Importlauf mit ID ${id} gefunden.`);
    return run;
  }
}
