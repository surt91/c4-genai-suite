import { Box, Progress, Text } from '@mantine/core';
import type { TestCaseProgress } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface EvaluationProgressBarProps {
  progress: TestCaseProgress;
  showLabel?: boolean;
}

export function EvaluationProgressBar({ progress, showLabel = true }: EvaluationProgressBarProps) {
  const percentage = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Box w="100%">
      <Progress value={percentage} size="sm" />
      {showLabel && (
        <Text component="div" mt={4} fz="xs" lh="1rem" c="gray.7">
          {texts.evals.evaluations.progressText(progress.done, progress.total)}
        </Text>
      )}
    </Box>
  );
}
