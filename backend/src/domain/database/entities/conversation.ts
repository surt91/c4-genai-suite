import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { ConfigurationEntity } from './configuration.js';
import { ConversationFileEntity } from './conversation-file.js';
import { MessageEntity } from './message.js';
import { UserEntity } from './user.js';

export type ConversationContext = Record<string, string>;

export type ExtensionUserArguments = Record<string, Record<string, any>>;

export type ConversationRating = 'good' | 'bad' | 'unrated';

@Entity({ name: 'conversations', schema })
// Used by GetConversationsHandler: find by userId, order by updatedAt DESC
// See: src/domain/chat/use-cases/get-conversations.ts
@Index(['userId', 'updatedAt'])
@Index(['configurationId'])
export class ConversationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  name!: string;

  @Column({ default: false })
  isNameSetManually!: boolean;

  @Column({ nullable: true })
  llm?: string;

  @Column({ nullable: true })
  rating?: ConversationRating;

  @ManyToOne(() => ConfigurationEntity, (configuration) => configuration.conversations, { onDelete: 'SET NULL' })
  configuration!: Relation<ConfigurationEntity>;

  @Column()
  configurationId!: number;

  @ManyToOne(() => UserEntity, (user) => user.conversations, { onDelete: 'CASCADE' })
  user!: Relation<UserEntity>;

  @Column()
  userId!: string;

  @OneToMany(() => MessageEntity, (message) => message.conversation, { onDelete: 'CASCADE', cascade: true })
  messages!: MessageEntity[];

  @Column('json', { nullable: true })
  context?: ConversationContext;

  @Column('json', { nullable: true })
  extensionUserArguments?: ExtensionUserArguments;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  // Set when the conversation has been deleted. It can be restored for a while ("Undo") and is purged afterwards.
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => ConversationFileEntity, (cf) => cf.conversation)
  files!: ConversationFileEntity[];
}
