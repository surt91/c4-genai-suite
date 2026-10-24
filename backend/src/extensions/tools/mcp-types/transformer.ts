import { CallToolResult } from '@modelcontextprotocol/client';
import { Source } from '../../../domain/chat/index.js';
import { convertGaibleJsonToSource, convertGaibleJsonToText, GaibleJsonType } from './gaible-json.type.js';

export type MCPText = { type: 'text'; text: string };
export type TransformedResponse = { content: MCPText[]; sources: Source[] };

export function transformMCPToolResponse(res: CallToolResult): TransformedResponse {
  const gaibleContent = res.content.filter(
    (x) => x.type === 'resource' && x.resource.mimeType === 'application/x-gaible-json-v1',
  );
  if (!gaibleContent.length) {
    const content = res.content.filter((x) => x.type === 'text');
    return {
      content,
      sources: [],
    };
  }

  return gaibleContent.reduce(
    (prev, curr) => {
      if (curr.type !== 'resource') {
        return prev;
      }

      if (!('text' in curr.resource)) {
        return prev;
      }

      const { text } = curr.resource;
      const gaibleJsonData = JSON.parse(text) as GaibleJsonType;
      prev.sources.push(convertGaibleJsonToSource(gaibleJsonData));
      prev.content.push(convertGaibleJsonToText(gaibleJsonData));

      return prev;
    },
    { content: [] as MCPText[], sources: [] as Source[] },
  );
}
