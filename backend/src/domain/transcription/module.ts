import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtensionEntity } from '../database/index.js';
import { TranscribeAudioHandler } from './use-cases/index.js';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ExtensionEntity])],
  providers: [TranscribeAudioHandler],
})
export class TranscriptionModule {}
