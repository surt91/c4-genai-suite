import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileDto } from 'src/api';
import { ProfileContext } from 'src/hooks';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { i18next } from 'src/texts/i18n';
import { UserProfileModal } from './UserProfileModal';

vi.mock('src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/api')>()),
  useApi: () => ({}),
}));

const profile = { id: '1', name: 'User', email: 'user@example.com', isAdmin: false } as ProfileDto;

describe('UserProfileModal', () => {
  afterEach(async () => {
    await i18next.changeLanguage('en');
  });

  it('validates in the language of the installation', async () => {
    // the language is set when the settings have been loaded, i.e. after the modules have been loaded
    await i18next.changeLanguage('de');

    render(
      <ProfileContext.Provider value={profile}>
        <UserProfileModal isOpen onClose={vi.fn()} canChangePassword />
      </ProfileContext.Provider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: texts.chat.settings.security }));
    fireEvent.change(screen.getByLabelText(texts.chat.settings.currentPassword), { target: { value: 'old' } });
    fireEvent.change(screen.getByLabelText(texts.common.password), { target: { value: 'new' } });
    fireEvent.change(screen.getByLabelText(texts.common.passwordConfirm), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: texts.chat.settings.updatePassword }));

    expect(await screen.findByText('Passwörter stimmen nicht überein.')).toBeInTheDocument();
  });
});
