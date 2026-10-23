import { generateNameForDuplicate } from './duplicate-conversation.js';

describe('DuplicateConversationsHandler', () => {
  it('should generate duplicated name: first duplication', () => {
    const newTitle = generateNameForDuplicate('My Conversation', ['My Conversation']);
    expect(newTitle).toBe('My Conversation (2)');
  });
  it('should generate duplicated name: second duplication', () => {
    const newTitle = generateNameForDuplicate('My Conversation', ['My Conversation', 'My Conversation (2)']);
    expect(newTitle).toBe('My Conversation (3)');
  });
  it('should generate duplicated name: duplication of duplication', () => {
    const newTitle = generateNameForDuplicate('My Conversation (2)', ['My Conversation', 'My Conversation (2)']);
    expect(newTitle).toBe('My Conversation (3)');
  });
  it('should generate duplicated name: fill non-contiguous', () => {
    const newTitle = generateNameForDuplicate('My Conversation (2)', [
      'My Conversation',
      'My Conversation (2)',
      'My Conversation (4)',
    ]);
    expect(newTitle).toBe('My Conversation (3)');
  });
  it('should generate duplicated name: disregard equal names', () => {
    const newTitle = generateNameForDuplicate('My Conversation', ['My Conversation', 'My Conversation', 'My Conversation']);
    expect(newTitle).toBe('My Conversation (2)');

    const newTitle2 = generateNameForDuplicate('My Conversation', [
      'My Conversation',
      'My Conversation (2)',
      'My Conversation (2)',
    ]);
    expect(newTitle2).toBe('My Conversation (3)');
  });
});
