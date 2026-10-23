import { UserArgsExtension } from './dev-only/user-args';
import { ExtensionLibraryModule } from './module';

describe(ExtensionLibraryModule.name, () => {
  const nodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('does not register the dev-only extensions in production', () => {
    process.env.NODE_ENV = 'production';

    expect(ExtensionLibraryModule.register().providers).not.toContain(UserArgsExtension);
  });

  it('registers the dev-only extensions outside of production', () => {
    process.env.NODE_ENV = 'development';

    expect(ExtensionLibraryModule.register().providers).toContain(UserArgsExtension);
  });
});
