import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { ChatSuggestion } from '../../shared.js';
import { schema } from '../typeorm.helper.js';
import { ConfigurationUserEntity } from './configuration-user.js';
import { ConversationEntity } from './conversation.js';
import { ExtensionEntity } from './extension.js';
import { UserGroupEntity } from './user-group.js';

export type ConfigurationRepository = Repository<ConfigurationEntity>;

export enum ConfigurationStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  DELETED = 'deleted',
}

@Entity({ name: 'configurations', schema })
@Index(['status'])
export class ConfigurationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ default: '' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ConfigurationStatus,
    default: ConfigurationStatus.ENABLED,
  })
  status!: ConfigurationStatus;

  @Column('text', { nullable: true })
  agentName?: string;

  @Column('text', { nullable: true })
  chatFooter?: string;

  @Column('json', { nullable: true })
  chatSuggestions?: ChatSuggestion[];

  @OneToMany(() => ConversationEntity, (conversation) => conversation.configuration, { onDelete: 'SET NULL' })
  conversations!: ConversationEntity[];

  @OneToMany(() => ExtensionEntity, (extension) => extension.configuration, { cascade: ['insert', 'update', 'remove'] })
  extensions!: ExtensionEntity[];

  @ManyToMany(() => UserGroupEntity, (userGroup) => userGroup.configurations)
  @JoinTable()
  userGroups!: UserGroupEntity[];

  @OneToMany(() => ConfigurationUserEntity, (uc) => uc.configuration)
  users!: ConfigurationUserEntity[];

  @RelationId('userGroups')
  userGroupIds!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
