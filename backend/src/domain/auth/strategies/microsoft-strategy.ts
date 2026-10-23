import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { User } from '../../users/index.js';
import { AuthService } from '../auth.service.js';
import { withStore } from './strategy-helper.js';

type Profile = {
  id: string;
  emails: { value: string }[];
  userPrincipalName: string;
  displayName: string;
  picture?: string;
};

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(authService: AuthService) {
    super(
      withStore({
        callbackURL: `${authService.config.baseUrl}/auth/login/microsoft/callback`,
        clientID: authService.config.microsoft?.clientId || 'INVALID',
        clientSecret: authService.config.microsoft?.clientSecret || 'INVALID',
        scope: ['user.read'],
        tenant: authService.config.microsoft?.tenant || 'common',
      }),
    );
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): Promise<Partial<User>> {
    const { id, emails, userPrincipalName, displayName: name, picture } = profile;

    const user = {
      id,
      accessToken,
      email: emails[0]?.value ?? userPrincipalName,
      name,
      picture,
      refreshToken,
    };

    return Promise.resolve(user);
  }
}
