import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { assignDefined } from '../../../lib/index.js';
import { ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { ExtensionConfiguration } from '../interfaces.js';
import { ExplorerService } from '../services/index.js';
import { unmaskExtensionValues } from './utils.js';

export class TestExtension {
  constructor(
    public readonly name: string,
    public readonly configuration: ExtensionConfiguration,
    public readonly id?: number,
  ) {}
}

@CommandHandler(TestExtension)
export class TestExtensionHandler implements ICommandHandler<TestExtension, boolean> {
  constructor(
    private readonly explorer: ExplorerService,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  async execute(command: TestExtension): Promise<boolean> {
    const { id, configuration, name } = command;

    const extension = this.explorer.getExtension(name);
    if (!extension) {
      throw new NotFoundException('Cannot find extension.');
    }

    if (!extension.test) {
      throw new BadRequestException('Extension cannot be tested.');
    }

    const entity = id ? await this.extensions.findOneBy({ id }) : undefined;
    // The stored values (secrets) of another extension type must not be sent to the endpoint of this one.
    if (id && (!entity || entity.name !== name)) {
      throw new NotFoundException('Cannot find extension.');
    }

    if (entity) {
      delete entity.state;
    }

    const extensionConfiguration = assignDefined(entity?.values ?? {}, unmaskExtensionValues(configuration));

    await extension.test(extensionConfiguration);
    return true;
  }
}
