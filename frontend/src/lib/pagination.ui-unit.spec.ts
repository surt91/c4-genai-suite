import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { totalWithoutCount, useStepBackFromEmptyPage } from './pagination';

describe('totalWithoutCount', () => {
  it('assumes another page after a full page', () => {
    expect(totalWithoutCount(0, 20, 20)).toBe(40);
    expect(totalWithoutCount(2, 20, 20)).toBe(80);
  });

  it('ends with a page that is not full', () => {
    expect(totalWithoutCount(0, 20, 5)).toBe(5);
    expect(totalWithoutCount(2, 20, 5)).toBe(45);
  });
});

describe('useStepBackFromEmptyPage', () => {
  it('goes back from an empty page', () => {
    const setPage = vi.fn();
    renderHook(() => useStepBackFromEmptyPage(3, setPage, true, 0));

    expect(setPage).toHaveBeenCalledWith(2);
  });

  it('stays on the first page and while loading', () => {
    const setPage = vi.fn();
    renderHook(() => useStepBackFromEmptyPage(0, setPage, true, 0));
    renderHook(() => useStepBackFromEmptyPage(3, setPage, false, 0));

    expect(setPage).not.toHaveBeenCalled();
  });
});
