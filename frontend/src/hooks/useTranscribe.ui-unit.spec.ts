import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import { useTranscribe } from './useTranscribe';

const transcribeAudio = vi.fn();

vi.mock('src/api', () => ({
  useApi: () => ({ transcription: { transcribeAudio } }),
}));

vi.mock('src/lib/notifications', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), info: vi.fn(), success: vi.fn(), warn: vi.fn() }),
}));

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.onstop?.();
  });

  constructor() {
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  requestData() {
    this.ondataavailable?.({ data: new Blob(['audio']) });
  }
}

describe('useTranscribe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeMediaRecorder.instances = [];
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
      configurable: true,
    });
    transcribeAudio.mockResolvedValue({ text: 'Transcribed text' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('stops the recording after the maximum duration and transcribes it', async () => {
    const onTranscriptReceived = vi.fn();
    const { result } = renderHook(() => useTranscribe({ extensionId: 1, onTranscriptReceived, maxDurationMs: 1000 }));

    await act(() => result.current.toggleRecording());
    expect(result.current.isRecording).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(FakeMediaRecorder.instances[0].stop).toHaveBeenCalledOnce();
    expect(toast.info).toHaveBeenCalledExactlyOnceWith(texts.chat.transcribe.maxDurationReached);
    expect(onTranscriptReceived).toHaveBeenCalledWith('Transcribed text');
    expect(result.current.isRecording).toBe(false);
  });
});
