import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import type { ExtensionObjectArgument } from '../../extensions/index.js';
import { schema } from '../typeorm.helper.js';
import { ConfigurationEntity } from './configuration.js';

export type ExtensionRepository = Repository<ExtensionEntity>;

export type ExtensionState = {
  changes?: Record<string, any>[];
  changed?: boolean;
  [key: string]: any;
};

@Entity({ name: 'extensions', schema })
@Index(['configurationId'])
// Used to fetch enabled extensions for a configuration
// See: src/domain/extensions/use-cases/update-configuration-user-values.ts, get-bucket-availability.ts
@Index(['configurationId', 'enabled'])
export class ExtensionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  externalId!: string;

  @Column()
  enabled!: boolean;

  @Column({ type: 'simple-json', nullable: true })
  state?: ExtensionState;

  @Column('jsonb')
  values!: Record<string, any>;

  @Column('simple-json', { nullable: true })
  configurableArguments?: ExtensionObjectArgument;

  @ManyToOne(() => ConfigurationEntity, (configuration) => configuration.extensions, { onDelete: 'CASCADE' })
  configuration!: Relation<ConfigurationEntity>;

  @Column()
  configurationId!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
