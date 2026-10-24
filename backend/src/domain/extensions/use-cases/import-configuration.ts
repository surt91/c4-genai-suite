import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource, In, QueryRunner } from 'typeorm';
import { I18nService } from '../../../localization/i18n.service.js';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity, UserGroupEntity } from '../../database/index.js';
import { ConfigurationModel, ExtensionArgument, ExtensionSpec } from '../interfaces.js';
import { ExplorerService } from '../services/index.js';
import { PortableConfiguration, PortableExtension } from './export-configuration.js';
import { buildConfiguration, removeMaskedValues, validateConfiguration } from './utils.js';

export class ImportConfiguration {
  constructor(public readonly data: PortableConfiguration) {}
}

/** An imported extension whose secrets were masked in the export and must be entered again. */
export interface ImportedExtensionWithoutSecrets {
  // the name of the extension type, e.g. `azure-open-ai-model`
  name: string;
  // the title of the extension type
  title: string;
  // the titles of the secret fields (or their paths if they have no title)
  fields: string[];
}

export interface ImportConfigurationResponse {
  configuration: ConfigurationModel;
  warnings: string[];
  // the extensions which have been imported disabled, because their secrets must be entered again
  missingSecrets: ImportedExtensionWithoutSecrets[];
}

@CommandHandler(ImportConfiguration)
export class ImportConfigurationHandler implements ICommandHandler<ImportConfiguration, ImportConfigurationResponse> {
  private readonly logger = new Logger(ImportConfigurationHandler.name);

  constructor(
    private dataSource: DataSource,
    private readonly extensionExplorer: ExplorerService,
    private readonly i18n: I18nService,
  ) {}

  async execute(command: ImportConfiguration): Promise<ImportConfigurationResponse> {
    const { data } = command;
    const warnings: string[] = [];
    const missingSecrets: ImportedExtensionWithoutSecrets[] = [];
    this.check(data, warnings);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userGroups = await this.validateAndResolveUserGroups(data, queryRunner, warnings);
      const configurationEntity = this.createConfigurationEntity(data, userGroups);
      const savedConfiguration = await queryRunner.manager.save(ConfigurationEntity, configurationEntity);

      // Create extensions
      const extensionEntities: ExtensionEntity[] = [];
      for (const portableExtension of data.extensions) {
        const extensionEntity = this.createExtensionEntity(portableExtension, savedConfiguration, missingSecrets);
        extensionEntities.push(extensionEntity);
      }

      await queryRunner.manager.save(ExtensionEntity, extensionEntities);
      await queryRunner.commitTransaction();

      // Reload configuration with extensions (outside transaction)
      const reloadedConfiguration = await this.reloadConfiguration(savedConfiguration);

      // Build configuration model
      const configuration = await buildConfiguration(reloadedConfiguration, this.extensionExplorer, true, false);
      this.logger.log(
        `Successfully imported configuration "${data.name}" (ID: ${savedConfiguration.id}) with ${extensionEntities.length} extension(s)`,
      );

      return { configuration, warnings, missingSecrets };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Perform basic checks on the imported data before processing
   * @param data
   * @param warnings
   * @private
   */
  private check(data: PortableConfiguration, warnings: string[]) {
    this.checkVersion(data, warnings);
    this.validateExtensionsExists(data.extensions);
    this.validateExtensions(data.extensions);
  }

  private async reloadConfiguration(savedConfiguration: ConfigurationEntity) {
    const reloadedConfiguration = await this.dataSource.manager.findOne(ConfigurationEntity, {
      where: { id: savedConfiguration.id },
      relations: { extensions: true },
    });

    if (!reloadedConfiguration) throw new BadRequestException('Failed to reload imported configuration');
    return reloadedConfiguration;
  }

  /**
   * Exports contain masks instead of the secrets (API keys, passwords). They are not stored as secrets: the fields are
   * left empty and the extension is disabled until an admin has entered the secrets again.
   */
  private createExtensionEntity(
    ext: PortableExtension,
    savedConfiguration: ConfigurationEntity,
    missingSecrets: ImportedExtensionWithoutSecrets[],
  ) {
    const values = structuredClone(ext.values ?? {});
    const removed = removeMaskedValues(values);

    const extensionEntity = new ExtensionEntity();
    extensionEntity.name = ext.name;
    extensionEntity.enabled = ext.enabled && removed.length === 0;
    extensionEntity.values = values;

    if (removed.length > 0) {
      const spec = this.extensionExplorer.getExtension(ext.name)?.spec;
      missingSecrets.push({
        name: ext.name,
        title: spec?.title ?? ext.name,
        fields: removed.map((path) => getFieldTitle(spec, path)),
      });
    }

    extensionEntity.configurableArguments = ext.configurableArguments;
    extensionEntity.configurationId = savedConfiguration.id;
    // externalId is left empty: the database trigger generates a unique `<name>_<id>`.
    return extensionEntity;
  }

  private createConfigurationEntity(data: PortableConfiguration, userGroups: any[] | UserGroupEntity[]) {
    const configurationEntity = new ConfigurationEntity();
    configurationEntity.name = data.name;
    configurationEntity.description = data.description;
    configurationEntity.status = data.enabled ? ConfigurationStatus.ENABLED : ConfigurationStatus.DISABLED;
    configurationEntity.agentName = data.agentName;
    configurationEntity.chatFooter = data.chatFooter;
    configurationEntity.chatSuggestions = data.chatSuggestions;
    configurationEntity.userGroups = userGroups;
    return configurationEntity;
  }

  private async validateAndResolveUserGroups(data: PortableConfiguration, queryRunner: QueryRunner, warnings: string[]) {
    if (!data.userGroupIds?.length) return [];
    const userGroups = await queryRunner.manager.findBy(UserGroupEntity, { id: In(data.userGroupIds) });
    if (userGroups.length === 0) {
      throw new BadRequestException('Cannot import configuration: none of the specified user groups exist in this system');
    }
    if (userGroups.length < data.userGroupIds.length) {
      const foundIds = userGroups.map((ug) => ug.id);
      const missingIds = data.userGroupIds.filter((id) => !foundIds.includes(id));
      this.logger.warn(
        `Some user groups not found during import of "${data.name}". Missing: ${missingIds.join(', ')}. Proceeding with available groups.`,
      );
      warnings.push(
        this.i18n.t('texts.configuration.warningMissingUserGroups', { name: data.name, missingIds: missingIds.join(', ') }),
      );
    }

    return userGroups;
  }

  /**
   * Validate imported values against extension spec
   * @private
   * @param portableExtensions
   */
  private validateExtensions(portableExtensions: PortableExtension[]) {
    for (const portableExtension of portableExtensions) {
      const extension = this.extensionExplorer.getExtension(portableExtension.name);
      if (!extension) continue; // Already handled missing extensions above
      try {
        const values = { ...portableExtension.values };
        validateConfiguration(values, extension.spec);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new BadRequestException(`Invalid configuration for extension "${portableExtension.name}": ${errorMessage}`);
      }
    }
  }

  /**
   * Validate that all extensions exist in the system
   * @param portableExtensions
   * @private
   */
  private validateExtensionsExists(portableExtensions: PortableExtension[]) {
    const unavailableExtensions: string[] = [];
    for (const portableExtension of portableExtensions) {
      const extension = this.extensionExplorer.getExtension(portableExtension.name);
      if (!extension) unavailableExtensions.push(portableExtension.name);
    }

    if (unavailableExtensions.length > 0) {
      throw new BadRequestException(
        `The following extensions are not available in this system: ${unavailableExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Check version and warn if different
   * @param data
   * @param warnings
   * @private
   */
  private checkVersion(data: PortableConfiguration, warnings: string[]) {
    const currentVersion = process.env.VERSION || 'unknown';
    if (data.version && data.version !== currentVersion) {
      warnings.push(
        this.i18n.t('texts.configuration.warningVersionMismatch', {
          name: data.name,
          version: data.version,
          currentVersion,
        }),
      );
    }
  }
}

function getFieldTitle(spec: ExtensionSpec | undefined, path: string[]) {
  let argument: ExtensionArgument | undefined;
  let properties: Record<string, ExtensionArgument> | undefined = spec?.arguments;
  for (const key of path) {
    argument = properties?.[key];
    properties = argument?.type === 'object' ? argument.properties : undefined;
  }
  return argument?.title || path.join('.');
}
