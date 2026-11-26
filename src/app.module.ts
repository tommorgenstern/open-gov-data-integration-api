import { Module } from '@nestjs/common';
import { AccidentsModule } from './accidents/accidents.module';
import { HealthController } from './health.controller';
import { MetadataModule } from './metadata/metadata.module';
import { RegionsModule } from './regions/regions.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [RegionsModule, AccidentsModule, StatisticsModule, MetadataModule],
  controllers: [HealthController],
})
export class AppModule {}
