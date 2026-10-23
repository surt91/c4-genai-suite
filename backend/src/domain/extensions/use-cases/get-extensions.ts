import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { ConfiguredExtension } from '../interfaces.js';
import { ExplorerService } from '../services/explorer-service.js';
import { buildExtension, maskKeyValues } from './utils.js';

export class GetExtensions {
  constructor(
    public readonly configurationId: number,
    public readonly includeDisabled = false,
    public readonly maskKeys = true,
  ) {}
}

export class GetExtensionsResponse {
  constructor(public readonly extensions: ConfiguredExtension[]) {}
}

@QueryHandler(GetExtensions)
export class GetExtensionsHandler implements IQueryHandler<GetExtensions, GetExtensionsResponse> {
  constructor(
    private readonly explorer: ExplorerService,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  async execute(request: GetExtensions): Promise<GetExtensionsResponse> {
    const { configurationId, includeDisabled, maskKeys } = request;

    const result = await this.extensions.find({
      where: {
        configurationId: configurationId,
      },
      order: {
        id: 'ASC',
      },
    });

    const response: ConfiguredExtension[] = [];

    for (const entity of result) {
      const extension = this.explorer.getExtension(entity.name);

      if (extension && (entity.enabled || includeDisabled)) {
        const configuredExtension = await buildExtension(entity, extension);
        if (maskKeys) {
          maskKeyValues(configuredExtension);
        }
        response.push(configuredExtension);
      }
    }

    return new GetExtensionsResponse(response);
  }
}
