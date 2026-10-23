import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePersistentState } from './stored';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads the stored value', () => {
    localStorage.setItem('assistant', '7');

    const { result } = renderHook(() => usePersistentState<number | null>('assistant', null));

    expect(result.current[0]).toBe(7);
  });

  it('shares updates between all users of the key', () => {
    const first = renderHook(() => usePersistentState<number | null>('assistant', null));
    const second = renderHook(() => usePersistentState<number | null>('assistant', null));

    act(() => first.result.current[1](3));

    expect(second.result.current[0]).toBe(3);
    expect(localStorage.getItem('assistant')).toBe('3');
  });
});
