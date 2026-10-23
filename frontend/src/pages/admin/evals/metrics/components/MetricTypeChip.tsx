import { Badge } from '@mantine/core';
import { texts } from 'src/texts';

interface MetricTypeChipProps {
  type: string;
}

export function MetricTypeChip({ type }: MetricTypeChipProps) {
  const config = getTypeConfig(type);

  return (
    <Badge color={config.color} variant={config.variant} tt="none" data-color={config.color}>
      {config.label}
    </Badge>
  );
}

function getTypeConfig(type: string): { label: string; color: string; variant: 'filled' | 'light' } {
  switch (type) {
    case 'ANSWER_RELEVANCY':
      return { label: texts.evals.metric.typeAnswerRelevancy, color: 'blue', variant: 'filled' };
    case 'FAITHFULNESS':
      return { label: texts.evals.metric.typeFaithfulness, color: 'green', variant: 'filled' };
    case 'HALLUCINATION':
      return { label: texts.evals.metric.typeHallucination, color: 'red', variant: 'filled' };
    case 'G_EVAL':
      return { label: texts.evals.metric.typeGEval, color: 'grape', variant: 'filled' };
    default:
      return { label: type, color: 'gray', variant: 'light' };
  }
}
