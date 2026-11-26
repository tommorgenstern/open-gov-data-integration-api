import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildSwaggerConfig } from './swagger';

// Generates openapi.json (the static API documentation) without starting the
// server or touching the database. Run: npm run openapi:export
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  await app.close();
  console.log(`OpenAPI-Spezifikation geschrieben: ${outPath}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
