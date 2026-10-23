import { SourceDto } from 'src/api';
import { texts } from 'src/texts';
import { storedToolCalls } from '../conversation/ChatItemTools';
import { useStateOfMessage } from '../state/chat';
import { InspectorSourceEntry, InspectorToolEntry } from '../state/inspector';

export function sourceName(source: SourceDto) {
  const title = source.metadata?.title as unknown;
  return typeof title === 'string' && title ? title : source.title;
}

export function sourceTitle(entry: InspectorSourceEntry) {
  const source = entry.sources[entry.index];
  return source ? sourceName(source) : texts.chat.inspector.source;
}

export function useToolTitle(entry: InspectorToolEntry | undefined) {
  const message = useStateOfMessage(entry?.conversationId ?? 0, entry?.messageId ?? 0);
  const tools = message?.toolCalls ?? storedToolCalls(message?.tools, message?.interactions);
  return (entry && tools.find((t) => t.id === entry.toolId)?.name) || texts.chat.inspector.tool;
}

/** Parses the formatted pages of a (merged) source, e.g. "1-2, 4", into the first page of each range. */
export function citedPages(pages: unknown): number[] {
  if (typeof pages !== 'string' || !pages) {
    return [];
  }
  return pages
    .split(',')
    .map((range) => parseInt(range.trim().split('-')[0], 10))
    .filter((page) => !isNaN(page));
}
