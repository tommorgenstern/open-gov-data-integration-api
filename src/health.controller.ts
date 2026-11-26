import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'kysely';
import { db } from './db/db';

@ApiTags('System')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({
    summary: 'Health-Check',
    description: 'Prüft, ob die API läuft und die Datenbank erreichbar ist.',
  })
  async health(): Promise<{ status: string; database: 'up' | 'down' }> {
    let database: 'up' | 'down' = 'down';
    try {
      await sql`select 1`.execute(db);
      database = 'up';
    } catch {
      database = 'down';
    }
    return { status: 'ok', database };
  }
}
