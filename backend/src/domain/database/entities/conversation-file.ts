import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Repository, Unique } from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { ConversationEntity } from './conversation.js';
import { FileEntity } from './file.js';
import { MessageEntity } from './message.js';

export type ConversationFileRepository = Repository<ConversationFileEntity>;

@Entity({ name: 'conversations_files', schema })
@Unique(['conversationId', 'fileId'])
@Index(['conversationId'])
@Index(['fileId'])
@Index(['messageId'])
export class ConversationFileEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Relation<ConversationEntity>;

  @Column({ nullable: false })
  conversationId!: number;

  @ManyToOne(() => FileEntity, (user) => user.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file!: Relation<FileEntity>;

  @Column({ nullable: false })
  fileId!: number;

  @ManyToOne(() => MessageEntity, (message) => message.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message?: Relation<MessageEntity>;

  @Column({ nullable: true })
  messageId?: number;
}
