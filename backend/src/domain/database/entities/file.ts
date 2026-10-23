import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { BlobEntity } from './blob.js';
import { BucketEntity } from './bucket.js';
import { ConversationFileEntity } from './conversation-file.js';
import { ExtensionEntity } from './extension.js';
import { UserEntity } from './user.js';

export type FileRepository = Repository<FileEntity>;

export enum FileUploadStatus {
  // file upload to rag service is in progress
  InProgress = 'inProgress',
  // file upload to rag service was completed successfully
  Successful = 'successful',
}

@Entity({ name: 'files', schema })
// Used by file listing and quota checks: findBy/countBy bucketId + userId
// See: src/extensions/tools/files.ts, src/domain/files/use-cases/upload-file.ts
@Index(['bucketId', 'userId'])
@Index(['extensionId'])
export class FileEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  mimeType!: string;

  @Column()
  fileSize!: number;

  @Column()
  fileName!: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  user!: UserEntity | null;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => BucketEntity, { onDelete: 'CASCADE' })
  bucket?: Relation<BucketEntity>;

  @Column({ nullable: true })
  bucketId?: number;

  @ManyToOne(() => ExtensionEntity, { onDelete: 'SET NULL' })
  extension?: Relation<ExtensionEntity>;

  @Column({ nullable: true })
  extensionId?: number;

  @OneToMany(() => BlobEntity, (blob) => blob.file, { cascade: true })
  blobs!: BlobEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ConversationFileEntity, (cf) => cf.file)
  conversations!: ConversationFileEntity[];

  @Column()
  uploadStatus!: FileUploadStatus;
}
