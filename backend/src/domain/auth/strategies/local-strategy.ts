import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { isString } from 'class-validator';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import { hashApiKey, isArray } from '../../../lib/index.js';
import { UserEntity, UserRepository } from '../../database/index.js';
import { User } from '../../users/index.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly headers = ['x-api-key', 'x-apikey', 'api-key', 'apikey', 'authorization'];

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  async validate(request: Request): Promise<Partial<User> | null> {
    const key = this.findApiKey(request);

    if (key) {
      return this.userRepository.findOne({ where: { apiKey: key }, relations: ['userGroups'] });
    } else if (request.session.user) {
      return request.session.user;
    }

    return null;
  }

  private findApiKey(request: Request) {
    for (const candidate of this.headers) {
      const header = request.headers[candidate];
      const value = isArray(header) ? header[0] : header;

      if (isString(value) && value.trim().length > 0) {
        return hashApiKey(value.replace(/^Bearer /i, '').trim());
      }
    }

    return null;
  }
}
