import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
  RelationId,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { ConfigurationUserEntity } from './configuration-user.js';
import { ConversationEntity } from './conversation.js';
import { FileEntity } from './file.js';
import { UserGroupEntity } from './user-group.js';

export type UserRepository = Repository<UserEntity>;

@Entity({ name: 'users', schema })
export class UserEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, unique: true })
  email!: string;

  @Column({ length: 100, nullable: true, unique: true })
  apiKey?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @OneToMany(() => ConversationEntity, (conversation) => conversation.user, { onDelete: 'CASCADE' })
  conversations!: ConversationEntity[];

  @OneToMany(() => FileEntity, (file) => file.user, { onDelete: 'CASCADE' })
  files!: FileEntity[];

  @ManyToMany(() => UserGroupEntity, (userGroup) => userGroup.users, { cascade: true, eager: true })
  @JoinTable({
    name: 'users_user-groups',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userGroupId', referencedColumnName: 'id' },
  })
  userGroups!: UserGroupEntity[];

  @RelationId('userGroups')
  userGroupIds!: string[];

  @OneToMany(() => ConfigurationUserEntity, (uc) => uc.user)
  configurations!: ConfigurationUserEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
