import { Badge } from '@mantine/core';
import { texts } from 'src/texts';

interface LlmEndpointTypeChipProps {
  type: string;
}

export function LlmEndpointTypeChip({ type }: LlmEndpointTypeChipProps) {
  const config = getTypeConfig(type);

  return (
    <Badge color={config.color} variant={config.variant} tt="none" data-color={config.color}>
      {config.label}
    </Badge>
  );
}

function getTypeConfig(type: string): { label: string; color: string; variant: 'filled' | 'light' } {
  switch (type) {
    case 'OPENAI':
      return { label: texts.evals.llmEndpoint.typeOpenAI, color: 'blue', variant: 'filled' };
    case 'AZURE_OPENAI':
      return { label: texts.evals.llmEndpoint.typeAzureOpenAI, color: 'teal', variant: 'filled' };
    default:
      return { label: type, color: 'gray', variant: 'light' };
  }
}
