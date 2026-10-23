import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { i18next } from 'src/texts/i18n';
import { ModeSelectionStep } from './ModeSelectionStep';

describe('ModeSelectionStep', () => {
  afterEach(async () => {
    await i18next.changeLanguage('en');
  });

  it('is shown in the language of the installation', async () => {
    await i18next.changeLanguage('de');

    render(<ModeSelectionStep />);

    expect(screen.getByText('Art der Evaluation wählen')).toBeInTheDocument();
    expect(screen.getByText('Mit QA-Katalog')).toBeInTheDocument();
  });
});
