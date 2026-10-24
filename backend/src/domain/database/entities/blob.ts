import { Column, Entity, Index, ManyToOne, PrimaryColumn, Relation, Repository } from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { ConversationEntity } from './conversation.js';
import { FileEntity } from './file.js';
import { UserEntity } from './user.js';

export type BlobRepository = Repository<BlobEntity>;

export enum BlobCategory {
  FILE_ORIGINAL = 'original',
  FILE_PROCESSED = 'processed',
  LLM_IMAGE = 'llm_image',
  LOGO = 'logo',
}

@Entity({ name: 'blobs', schema })
@Index(['fileId'])
@Index(['userId'])
@Index(['conversationId'])
export class BlobEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  type!: string;

  @Column('text')
  buffer!: string;

  @Column({
    type: 'enum',
    enum: BlobCategory,
    default: BlobCategory.LLM_IMAGE,
    nullable: false,
  })
  category!: BlobCategory;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  file?: Relation<FileEntity>;

  // The owner: the user of the file or the user who generated the image. Generated images that have been stored before
  // the owner was recorded have no owner (and stay readable by all users, see GetBlob).
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  user!: UserEntity | null;

  @Column({ nullable: true })
  userId?: string;

  // The conversation, in which the image has been generated (only for generated images).
  @ManyToOne(() => ConversationEntity, { nullable: true, onDelete: 'CASCADE' })
  conversation?: Relation<ConversationEntity> | null;

  @Column({ nullable: true })
  conversationId?: number | null;

  @Column({ nullable: true })
  fileId?: number;
}
