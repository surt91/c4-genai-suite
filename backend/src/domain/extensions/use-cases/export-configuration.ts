import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationEntity } from '../../database/index.js';
import { ChatSuggestion } from '../../shared.js';
import { ExtensionObjectArgument } from '../interfaces.js';
import { ExplorerService } from '../services/index.js';
import { buildConfiguration, maskKeyValues } from './utils.js';

export class ExportConfiguration {
  constructor(public readonly id: number) {}
}

/**
 * Shared interface for extension data in import/export operations.
 */
export interface PortableExtension {
  name: string;
  enabled: boolean;
  values: Record<string, unknown>;
  configurableArguments?: ExtensionObjectArgument;
}

/**
 * Shared interface for configuration data in import/export operations.
 */
export interface PortableConfiguration {
  version?: string;
  exportedAt?: string;
  originId?: number;
  name: string;
  description: string;
  enabled: boolean;
  agentName?: string;
  chatFooter?: string;
  chatSuggestions?: ChatSuggestion[];
  userGroupIds?: string[];
  extensions: PortableExtension[];
}

export type ExportConfigurationResponse = PortableConfiguration;

@QueryHandler(ExportConfiguration)
export class ExportConfigurationHandler implements IQueryHandler<ExportConfiguration, ExportConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly repository: Repository<ConfigurationEntity>,
    private readonly extensionExplorer: ExplorerService,
  ) {}

  async execute(query: ExportConfiguration): Promise<ExportConfigurationResponse> {
    const configurationEntity = await this.repository.findOne({
      where: { id: query.id },
      relations: ['extensions'],
    });

    if (!configurationEntity) {
      throw new NotFoundException(`Configuration with id ${query.id} not found`);
    }

    const configuration = await buildConfiguration(configurationEntity, this.extensionExplorer, true, false);

    // Prepare export data with masked sensitive values
    const extensions: PortableExtension[] = (configuration.extensions || []).map((ext) => {
      maskKeyValues(ext);
      return {
        name: ext.name,
        enabled: ext.enabled,
        values: ext.values,
        configurableArguments: ext.configurableArguments,
      };
    });

    return {
      version: process.env.VERSION || 'unknown',
      exportedAt: new Date().toISOString(),
      originId: configuration.id,
      name: configuration.name,
      description: configuration.description,
      enabled: false,
      agentName: configuration.agentName,
      chatFooter: configuration.chatFooter,
      chatSuggestions: configuration.chatSuggestions,
      userGroupIds: configuration.userGroupIds,
      extensions,
    };
  }
}
