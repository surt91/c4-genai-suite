import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Repository, Unique } from 'typeorm';
import { schema } from '../typeorm.helper.js';
import { ConfigurationEntity } from './configuration.js';
import { UserEntity } from './user.js';

export type ConfigurationValues = { [id: string]: Record<string, any> };

export type ConfigurationUserRepository = Repository<ConfigurationUserEntity>;

@Entity({ name: 'configurations_users', schema })
@Unique(['user.id', 'configuration.id', 'isDefault'])
export class ConfigurationUserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ConfigurationEntity, (config) => config.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'configurationId' })
  configuration!: Relation<ConfigurationEntity>;

  @ManyToOne(() => UserEntity, (user) => user.configurations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ type: 'json', nullable: false })
  values!: ConfigurationValues;
}
