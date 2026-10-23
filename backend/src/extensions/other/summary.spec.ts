import { ChatContext } from 'src/domain/chat/interfaces';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';
import { SummaryPromptExtension } from './summary';

describe(SummaryPromptExtension.name, () => {
  it('passes the configured history size to the summarization', async () => {
    const sut = new SummaryPromptExtension({ t: (key: string) => key } as unknown as I18nService);
    expect(Object.keys(sut.spec.arguments)).toContain('historySize');

    const [middleware] = await sut.getMiddlewares({} as User, { values: { prompt: 'Summarize', historySize: 3 } } as never);
    const context = {} as ChatContext;
    await middleware.invoke(
      context,
      () => context,
      () => Promise.resolve(true),
    );

    expect(context.summaryConfig).toEqual({ prompt: 'Summarize', historyLength: 3 });
  });
});
