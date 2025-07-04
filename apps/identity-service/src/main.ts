import {
  BadRequestException,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './filters/AllExceptionsFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';

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
  const port = process.env.PORT || 3000;

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

void bootstrap();
