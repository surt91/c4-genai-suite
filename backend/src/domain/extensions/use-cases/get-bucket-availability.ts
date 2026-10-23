import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from '../../../lib/index.js';
import { BucketEntity, BucketRepository, ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { ExplorerService } from '../services/index.js';

export class GetBucketAvailability {
  constructor(
    public readonly configurationId: number,
    public readonly bucketType: 'user' | 'conversation',
  ) {}
}

export interface ExtensionBucketSettings {
  title: string;
  extensionId: number;
  maxFiles?: number;
  fileNameExtensions: string[];
}

export class GetBucketAvailabilityResponse {
  constructor(public readonly extensions: ExtensionBucketSettings[]) {}
}

@QueryHandler(GetBucketAvailability)
export class GetBucketAvailabilityHandler implements IQueryHandler<GetBucketAvailability, GetBucketAvailabilityResponse> {
  constructor(
    private readonly explorer: ExplorerService,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
  ) {}

  private getExtensionTitle(extensionName: string) {
    return this.explorer.getExtension(extensionName)?.spec?.title ?? extensionName;
  }
  async getExtensionSettings(configurationId: number, bucketType: 'conversation' | 'user'): Promise<ExtensionBucketSettings[]> {
    const extensions = await this.extensions.findBy({ configurationId: configurationId, enabled: true });
    const bucket = await this.buckets.findOneBy({ type: bucketType });
    const fileNameExtensions = bucket?.allowedFileNameExtensions ?? [];

    const fileExtensions = extensions?.map((extension) => {
      if (!extension.name.startsWith('files')) {
        return;
      }

      const baseSettings = {
        maxFiles: (extension.values.maxFiles ?? undefined) as number | undefined,
      };

      // for files without bucket, only allowed for conversations
      if (
        bucketType === 'conversation' &&
        isArray(extension.values.fileNameExtensions) &&
        extension.values.fileNameExtensions?.length &&
        !extension.values.bucket
      ) {
        return {
          ...baseSettings,
          title: this.getExtensionTitle(extension.name),
          extensionId: extension.id,
          fileNameExtensions: extension.values.fileNameExtensions as string[],
        };
      }

      // for files with bucket
      if (bucket && extension.values.bucket === bucket.id) {
        return {
          ...baseSettings,
          title: this.getExtensionTitle(extension.name),
          extensionId: extension.id,
          fileNameExtensions,
        };
      }
    });
    return fileExtensions?.filter((x) => !!x) ?? [];
  }

  async execute(request: GetBucketAvailability): Promise<GetBucketAvailabilityResponse> {
    const { configurationId, bucketType } = request;

    const extensions = await this.getExtensionSettings(configurationId, bucketType);
    return new GetBucketAvailabilityResponse(extensions);
  }
}
