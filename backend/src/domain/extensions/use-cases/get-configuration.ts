import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { ConfigurationEntity, ConfigurationRepository, ConfigurationStatus } from '../../database/index.js';
import { ConfigurationModel } from '../interfaces.js';
import { buildConfiguration } from './utils.js';

export class GetConfiguration {
  constructor(public readonly id: number) {}
}

export class GetConfigurationResponse {
  constructor(public readonly configuration: ConfigurationModel) {}
}

@QueryHandler(GetConfiguration)
export class GetConfigurationHandler implements IQueryHandler<GetConfiguration, GetConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
  ) {}

  async execute(request: GetConfiguration): Promise<GetConfigurationResponse> {
    const { id } = request;

    const entity = await this.configurations.findOneBy({ id, status: Not(ConfigurationStatus.DELETED) });

    if (!entity) {
      throw new NotFoundException(`Configuration with id ${id} was not found`);
    }

    const result = await buildConfiguration(entity);

    return new GetConfigurationResponse(result);
  }
}
