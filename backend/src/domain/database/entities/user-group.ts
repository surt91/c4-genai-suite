import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  PrimaryColumn,
  RelationId,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { ConfigurationEntity } from './configuration.js';
import { UserEntity } from './user.js';

export type UserGroupRepository = Repository<UserGroupEntity>;

@Entity({ name: 'user-groups', schema })
@Index(['name'])
export class UserGroupEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ default: false })
  isBuiltIn!: boolean;

  @Column({ nullable: true })
  monthlyTokens?: number;

  @Column({ nullable: true })
  monthlyUserTokens?: number;

  // The foreign keys of the join tables to the user groups have no referential actions (the default of TypeORM 0.3).
  @ManyToMany(() => UserEntity, (user) => user.userGroups, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  users!: UserEntity[];

  @ManyToMany(() => ConfigurationEntity, (configuration) => configuration.userGroups, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  configurations!: ConfigurationEntity[];

  @RelationId('configurations')
  configurationIds!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export const BUILTIN_USER_GROUP_ADMIN = 'admin';
export const BUILTIN_USER_GROUP_DEFAULT = 'default';
