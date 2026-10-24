import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Validates the request bodies with the class-validator decorators of the DTOs (invalid input: 400). */
export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe());
}
