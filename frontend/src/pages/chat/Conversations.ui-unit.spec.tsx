import { UseMutationResult } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { addDays, addMonths, startOfDay, startOfMonth } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { ConversationDto } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { i18next } from 'src/texts/i18n';
import { ConversationItems } from './ConversationItems';
import { useStateOfChats } from './state/listOfChats';

vi.mock('src/api', () => ({
  useApi: () => ({}),
}));

function mockMutation<TData = unknown, TVariables = void>(): UseMutationResult<TData, Error, TVariables, unknown> {
  type Result = UseMutationResult<TData, Error, TVariables, unknown>;
  return {
    data: undefined,
    error: null,
    isError: false,
    isIdle: true,
    isPaused: false,
    isSuccess: false,
    status: 'idle',
    mutate: vi.fn<Result['mutate']>(),
    mutateAsync: vi.fn<Result['mutateAsync']>(),
    reset: vi.fn(),
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPending: false,
    submittedAt: 0,
  };
}

vi.mock('src/pages/chat/state/chat', () => ({
  useStateOfSelectedChatId: vi.fn(),
  useStateOfIsWaitingForUser: vi.fn(() => false),
}));

vi.mock('src/pages/chat/state/listOfChats', () => ({
  useStateOfChats: vi.fn(),
  useListOfChats: vi.fn(),
  useStateMutateRenameChat: mockMutation,
  useMutateNewChat: mockMutation,
  useStateMutateRemoveAllChats: mockMutation,
  useStateMutateDuplicateChat: mockMutation,
  useStateOfChatEmptiness: vi.fn(),
  useStateMutateRemoveChat: mockMutation,
}));

describe('Conversations', () => {
  const now = new Date();

  const mockedChats: ConversationDto[] = [
    { id: 1, updatedAt: now, createdAt: now, configurationId: 1 },
    { id: 4, updatedAt: new Date('2023-10-01'), createdAt: new Date('2023-10-01'), configurationId: 1 },
    { id: 3, updatedAt: startOfDay(addDays(now, -20)), createdAt: startOfDay(addDays(now, -20)), configurationId: 1 },
    { id: 2, updatedAt: startOfDay(addDays(now, -2)), createdAt: startOfDay(addDays(now, -2)), configurationId: 1 },
    { id: 5, updatedAt: new Date('2022-10-01'), createdAt: new Date('2022-10-01'), configurationId: 1 },
  ];

  it('should render conversations components sorted by date', () => {
    vi.mocked(useStateOfChats).mockImplementation(() => mockedChats);

    render(<ConversationItems />);

    const todayElement = screen.getByText('Today');
    const previous7DaysElement = screen.getByText('Previous 7 Days');
    const previous30DaysElement = screen.getByText('Previous 30 Days');
    const year2023Element = screen.getByText('2023');
    const year2022Element = screen.getByText('2022');

    expect(todayElement).toBeInTheDocument();
    expect(previous7DaysElement).toBeInTheDocument();
    expect(previous30DaysElement).toBeInTheDocument();
    expect(year2023Element).toBeInTheDocument();
    expect(year2022Element).toBeInTheDocument();

    // Today is above Previous 7 Days
    expect(todayElement.compareDocumentPosition(previous7DaysElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Previous 7 Days is above Previous 30 Days
    expect(previous7DaysElement.compareDocumentPosition(previous30DaysElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Previous 30 Days is above 2023
    expect(previous30DaysElement.compareDocumentPosition(year2023Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 2023 is above 2022
    expect(year2023Element.compareDocumentPosition(year2022Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the months in the language of the installation', async () => {
    // a date older than 30 days in the last three months, whose month has another name in German
    const monthName = (locale: string, date: Date) => new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
    const twoMonthsAgo = [...Array(55).keys()]
      .map((n) => addDays(now, -35 - n))
      .filter((date) => date >= startOfMonth(addMonths(now, -3)))
      .find((date) => monthName('de', date) !== monthName('en', date))!;
    vi.mocked(useStateOfChats).mockImplementation(() => [
      { id: 1, updatedAt: twoMonthsAgo, createdAt: twoMonthsAgo, configurationId: 1 },
    ]);
    await i18next.changeLanguage('de');

    try {
      render(<ConversationItems />);

      expect(screen.getByText(monthName('de', twoMonthsAgo))).toBeInTheDocument();
    } finally {
      await i18next.changeLanguage('en');
    }
  });
});
