import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { ConfiguredExtension } from '../interfaces.js';
import { ExplorerService } from '../services/index.js';
import { buildExtension } from './utils.js';

export class GetExtension {
  constructor(public readonly filter: { id?: number } | { externalId?: string }) {}
}

export class GetExtensionResponse {
  constructor(public extension?: ConfiguredExtension) {}
}

@QueryHandler(GetExtension)
export class GetExtensionHandler implements IQueryHandler<GetExtension, GetExtensionResponse> {
  constructor(
    private readonly explorer: ExplorerService,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  async execute(request: GetExtension): Promise<GetExtensionResponse> {
    const entity = await this.extensions.findOneBy(request.filter);

    if (!entity) {
      return new GetExtensionResponse();
    }

    const extension = this.explorer.getExtension(entity.name);

    if (!extension) {
      return new GetExtensionResponse();
    }

    const result = await buildExtension(entity, extension);
    return new GetExtensionResponse(result);
  }
}
