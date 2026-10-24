import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { assignDefined } from '../../../lib/index.js';
import { ConversationEntity, ConversationRepository } from '../../database/index.js';
import { GetConfigurations, GetConfigurationsResponse } from '../../extensions/index.js';
import { User } from '../../users/index.js';
import { Conversation } from '../interfaces.js';

type Values = Partial<Pick<Conversation, 'context' | 'extensionUserArguments' | 'configurationId' | 'llm' | 'name'>>;

export class StartConversation {
  constructor(
    public readonly user: User,
    public readonly values: Values,
  ) {}
}

export class StartConversationResponse {
  constructor(public readonly conversation: Conversation) {}
}

@CommandHandler(StartConversation)
export class StartConversationHandler implements ICommandHandler<StartConversation, StartConversationResponse> {
  constructor(
    private readonly queryBus: QueryBus,
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(command: StartConversation): Promise<StartConversationResponse> {
    const { user, values } = command;
    const { context, extensionUserArguments, configurationId, llm, name } = values;

    const { configurations }: GetConfigurationsResponse = await this.queryBus.execute(new GetConfigurations(user, true));

    const entity = this.conversations.create();

    if (configurationId) {
      // If we cannot find the configuration we throw an error because it was an explicit decision.
      if (!configurations.find((x) => x.id === configurationId)) {
        throw new NotFoundException();
      }

      entity.configurationId = configurationId;
    } else {
      // Choose the first configuration as default if nothing configured. Without any (accessible and enabled) assistant
      // a conversation cannot be started until an admin has created one (the frontend shows an empty state instead).
      if (configurations.length === 0) {
        throw new ConflictException('There is no assistant to start a conversation with.');
      }

      entity.configurationId = configurations[0].id;
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { context, extensionUserArguments, llm, userId: user.id, name });

    // Use the save method otherwise we would not get previous values.
    const created = await this.conversations.save(entity);
    return new StartConversationResponse(created);
  }
}
