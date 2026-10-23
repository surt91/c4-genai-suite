import { AuthService } from '../auth.service.js';
import { GithubStrategy } from './github-strategy.js';

describe(GithubStrategy.name, () => {
  it('requests the scope that allows reading the (private) e-mail addresses', () => {
    const strategy = new GithubStrategy({
      config: { baseUrl: 'https://example.com', github: { clientId: 'id', clientSecret: 'secret' } },
    } as unknown as AuthService);

    expect((strategy as unknown as { _scope: string[] })._scope).toEqual(['user:email']);
  });
});
