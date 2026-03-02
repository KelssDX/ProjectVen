const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');

async function run() {
  const { AppModule } = require('../dist/app.module');

  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Vendrome API')
    .setDescription('Vendrome backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputDir = resolve(__dirname, '../../docs/openapi');
  mkdirSync(outputDir, { recursive: true });

  const outputPath = resolve(outputDir, 'backend-openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');
  await app.close();

  console.log(`OpenAPI spec generated: ${outputPath}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`OpenAPI generation failed: ${message}`);
  process.exit(1);
});
