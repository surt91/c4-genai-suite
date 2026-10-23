import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity, UserEntity, UserGroupEntity } from '../database/index.js';
import { AuthService } from './auth.service.js';
import { SessionStorage } from './session-storage.js';
import { GithubStrategy, GoogleStrategy, LocalAuthGuard } from './strategies/index.js';
import { LocalStrategy, MicrosoftStrategy, OAuthStrategy } from './strategies/index.js';

@Module({
  imports: [ConfigModule, PassportModule, TypeOrmModule.forFeature([SessionEntity, UserEntity, UserGroupEntity])],
  exports: [AuthService, SessionStorage],
  providers: [
    AuthService, //
    GithubStrategy,
    GoogleStrategy,
    LocalStrategy,
    MicrosoftStrategy,
    OAuthStrategy,
    SessionStorage,
    LocalAuthGuard,
  ],
})
export class AuthModule {}
