import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource, DeleteResult, IsNull, QueryFailedError } from 'typeorm';
import { ConfigurationEntity, ConversationEntity } from 'src/domain/database';
import { I18nService } from '../../../localization/i18n.service';

export class DeleteConfiguration {
  constructor(public readonly id: number) {}
}

@CommandHandler(DeleteConfiguration)
export class DeleteConfigurationHandler implements ICommandHandler<DeleteConfiguration, any> {
  constructor(
    private dataSource: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async execute(command: DeleteConfiguration): Promise<any> {
    let result: DeleteResult;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(ConversationEntity, { configurationId: command.id, llm: IsNull(), name: IsNull() });
      result = await queryRunner.manager.delete(ConfigurationEntity, { id: command.id });
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof QueryFailedError) {
        throw new BadRequestException(this.i18n.t('texts.chat.errorConfigurationUsed'));
      } else {
        throw error;
      }
    } finally {
      await queryRunner.release();
    }

    if (!result.affected) {
      throw new NotFoundException();
    }
  }
}
