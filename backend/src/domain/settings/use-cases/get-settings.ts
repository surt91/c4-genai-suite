import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { SettingEntity, SettingRepository } from '../../database/index.js';
import { Settings } from '../interfaces.js';
import { buildSettings } from './utils.js';

export class GetSettings {}

export class GetSettingsResponse {
  constructor(public readonly settings: Settings) {}
}

@QueryHandler(GetSettings)
export class GetSettingsHandler implements IQueryHandler<GetSettings, GetSettingsResponse> {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settings: SettingRepository,
  ) {}

  async execute(): Promise<GetSettingsResponse> {
    const emptySettings = { id: 0, createdAt: new Date(), updatedAt: new Date() };
    const entity = await this.settings.findOneBy({ id: 1 });
    const result = buildSettings(entity || emptySettings);

    return new GetSettingsResponse(result);
  }
}
