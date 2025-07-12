import { existsSync, readFileSync } from 'fs';
import path from 'path';

import {
  BadRequestException,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './filters/AllExceptionsFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  const version = getAppVersion();

  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties that do not have decorators
      forbidNonWhitelisted: true, // throws error if unexpected properties found
      transform: true, // transforms payload to DTO instance automatically
      exceptionFactory: (errors: ValidationError[]) => {
        const detailedErrors = errors
          .map((err) => {
            const constraints = err.constraints
              ? Object.values(err.constraints).join(', ')
              : 'Unknown error';

            return `${constraints}`;
          })
          .join(', ');

        return new BadRequestException(`Validation failed: ${detailedErrors}`);
      },
    }),
  );

  // Create a Swagger configuration object using the DocumentBuilder
  const config = new DocumentBuilder()
    .setTitle('Authorization API')
    .setVersion(version)
    .build();

  // Create a Swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Set up the Swagger UI endpoint
  SwaggerModule.setup('api', app, document);
  const port = process.env.PORT || 3000;

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

void bootstrap();

function getAppVersion(): string {
  const possiblePaths = [
    path.resolve(__dirname, '../package.json'), // when running from `src/`
    path.resolve(__dirname, './package.json'), // when running from `dist/`
  ];

  for (const pkgPath of possiblePaths) {
    if (existsSync(pkgPath)) {
      return JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
    }
  }

  // Fallback or throw an error
  throw new Error('Unable to locate package.json to read version.');
}
