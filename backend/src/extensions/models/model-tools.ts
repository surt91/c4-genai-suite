import { LanguageModelV4 } from '@ai-sdk/provider';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';

export const wrapWithReasoningTagName = (model: LanguageModelV4, reasoningTagName?: string) =>
  reasoningTagName
    ? wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: reasoningTagName }),
      })
    : model;
