import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth2';
import { User } from '../../users/index.js';
import { AuthService } from '../auth.service.js';
import { withStore } from './strategy-helper.js';

type Profile = {
  id: string;
  email?: string;
  displayName: string;
  picture?: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(authService: AuthService) {
    super(
      withStore({
        callbackURL: `${authService.config.baseUrl}/auth/login/google/callback`,
        clientID: authService.config.google?.clientId || 'INVALID',
        clientSecret: authService.config.google?.clientSecret || 'INVALID',
        scope: ['profile', 'email'],
      }),
    );
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): Promise<Partial<User>> {
    const { id, email, displayName: name, picture } = profile;

    const user = {
      id,
      accessToken,
      email,
      name,
      picture,
      refreshToken,
    };

    return Promise.resolve(user);
  }
}
