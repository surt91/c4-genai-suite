import { MantineProvider } from '@mantine/core';
import { render as renderDom, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { texts } from 'src/texts';
import { AssistantPicker } from './AssistantPicker';

const assistants = [
  { id: 1, name: 'Writer', description: 'Writes texts' },
  { id: 2, name: 'Translator', description: 'Translates texts into many languages' },
  { id: 3, name: 'Coder', description: '' },
];

const many = [
  ...assistants,
  { id: 4, name: 'Researcher', description: 'Searches the web' },
  { id: 5, name: 'Lawyer', description: 'Answers legal questions' },
  { id: 6, name: 'Accountant', description: 'Knows the tax law' },
];

// the test environment of Mantine: no transitions and the dropdown is not hidden without a layout (jsdom)
const render = (ui: ReactElement) => renderDom(<MantineProvider env="test">{ui}</MantineProvider>);

const button = () => screen.getByTestId('assistant-picker');

describe('AssistantPicker', () => {
  it('shows the assistant and selects another one with the mouse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssistantPicker assistants={assistants} value={assistants[0]} onChange={onChange} />);

    expect(button()).toHaveTextContent('Writer');
    expect(button()).toHaveAttribute('title', 'Writer');
    expect(button()).toHaveAttribute('role', 'combobox');
    expect(button()).toHaveAttribute('aria-expanded', 'false');

    await user.click(button());
    await screen.findByRole('listbox', { name: texts.chat.assistantPicker.label });
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Writer' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Translator' })).toHaveTextContent('Translates texts into many languages');
    // few assistants, no search
    expect(screen.queryByPlaceholderText(texts.chat.assistantPicker.search)).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Translator' }));
    expect(onChange).toHaveBeenCalledWith(2);
    await waitFor(() => expect(button()).toHaveAttribute('aria-expanded', 'false'));
    expect(button()).toHaveFocus();
  });

  it('can be used with the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssistantPicker assistants={assistants} value={assistants[0]} onChange={onChange} />);

    button().focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    // starts at the active assistant
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith(3);
    await waitFor(() => expect(button()).toHaveAttribute('aria-expanded', 'false'));
    expect(button()).toHaveFocus();

    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(button()).toHaveAttribute('aria-expanded', 'false'));
    expect(button()).toHaveFocus();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('does not report the active assistant as a change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssistantPicker assistants={assistants} value={assistants[1]} onChange={onChange} />);

    await user.click(button());
    await user.click(await screen.findByRole('option', { name: 'Translator' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('searches in names and descriptions when there are many assistants', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssistantPicker assistants={many} value={many[0]} onChange={onChange} />);

    await user.click(button());
    const search = await screen.findByPlaceholderText(texts.chat.assistantPicker.search);
    await waitFor(() => expect(search).toHaveFocus());

    await user.keyboard('tax');
    expect(screen.getAllByRole('option').map((option) => option.getAttribute('aria-label'))).toEqual(['Accountant']);

    await user.clear(search);
    await user.keyboard('nothing like this');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(texts.chat.assistantPicker.empty)).toBeInTheDocument();

    await user.clear(search);
    await user.keyboard('law{Enter}');
    expect(onChange).toHaveBeenCalledWith(5);
    await waitFor(() => expect(button()).toHaveAttribute('aria-expanded', 'false'));
    expect(button()).toHaveFocus();

    // the search is reset
    await user.click(button());
    await screen.findByRole('listbox');
    expect(screen.getAllByRole('option')).toHaveLength(many.length);
  });
});
