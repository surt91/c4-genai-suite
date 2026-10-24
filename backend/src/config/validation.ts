import { ArgumentMetadata, INestApplication, ValidationPipe } from '@nestjs/common';

const PRIMITIVES: unknown[] = [String, Boolean, Number, Array, Object];

/**
 * A request without a body has no `req.body` (`undefined`), which the validation pipe passes through even if it validates
 * (e.g. if all properties are optional). Validate and pass an empty object instead, so the handlers can rely on the DTO.
 */
class BodyValidationPipe extends ValidationPipe {
  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    const isDto = typeof metadata.metatype === 'function' && !PRIMITIVES.includes(metadata.metatype);
    if (metadata.type === 'body' && !metadata.data && value === undefined && isDto) {
      value = {};
    }
    return super.transform(value, metadata);
  }
}

/** Validates the request bodies with the class-validator decorators of the DTOs (invalid input: 400). */
export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(new BodyValidationPipe());
}
