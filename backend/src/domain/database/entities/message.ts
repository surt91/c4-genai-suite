import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { ChatInteraction, Source } from '../../chat/index.js';
import { schema } from '../typeorm.helper.js';
import { ConfigurationEntity } from './configuration.js';
import { ConversationFileEntity } from './conversation-file.js';
import { ConversationEntity } from './conversation.js';

export type ExtensionSource = Source & { extensionExternalId: string };

@Entity({ name: 'messages', schema })
@Index(['conversationId'])
// Used by analytics: getMessageCount and getUsersCountByPeriod filter by type='human' and createdAt
// See: src/domain/database/repositories/message.repository.ts, conversation.repository.ts
@Index(['type', 'createdAt'])
@Index(['parentId'])
@Index(['configurationId'])
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string;

  @Column('simple-json')
  data!: any;

  @Column({ nullable: true })
  rating?: string;

  @Column({ nullable: true })
  error?: string;

  // Whether the generation of the answer was stopped (by the user or a disconnect) before it was complete.
  @Column({ default: false })
  stopped!: boolean;

  // The results of interactions during the generation (answered forms, opened URLs, failed tools).
  @Column('json', { nullable: true })
  interactions?: ChatInteraction[] | null;

  @Column('simple-json', { nullable: true })
  tools?: any;

  @Column()
  configurationId!: number;

  @ManyToOne(() => ConfigurationEntity)
  @JoinColumn({ name: 'configurationId' })
  configuration!: Relation<ConfigurationEntity>;

  @Column('simple-json', { nullable: true })
  debug?: any;

  @Column('json', { nullable: true })
  sources?: ExtensionSource[];

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  conversation!: Relation<ConversationEntity>;

  @Column({ nullable: true })
  parentId?: number;

  @ManyToOne(() => MessageEntity, (message) => message.children, { onDelete: 'CASCADE', nullable: true })
  parent?: Relation<MessageEntity>;

  @OneToMany(() => MessageEntity, (message) => message.parent, { onDelete: 'CASCADE', cascade: true })
  children!: MessageEntity[];

  @Column()
  conversationId!: number;

  @OneToMany(() => ConversationFileEntity, (cf) => cf.message)
  files!: ConversationFileEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
