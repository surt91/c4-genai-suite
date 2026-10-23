import { Badge, Loader, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconClock } from '@tabler/icons-react';
import { EvaluationStatus } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface EvaluationStatusChipProps {
  status: EvaluationStatus;
}

export function EvaluationStatusChip({ status }: EvaluationStatusChipProps) {
  const statusConfig = getStatusConfig(status);

  const chip = (
    <Badge color={statusConfig.color} variant={statusConfig.variant} size="lg" tt="none" fw={400} leftSection={statusConfig.icon}>
      {statusConfig.label}
    </Badge>
  );

  if (statusConfig.tooltip) {
    return (
      <Tooltip label={statusConfig.tooltip} withArrow>
        {chip}
      </Tooltip>
    );
  }

  return chip;
}

function getStatusConfig(status: EvaluationStatus) {
  switch (status) {
    case EvaluationStatus.Pending:
      return {
        label: texts.evals.evaluations.statusPending,
        color: 'gray',
        variant: 'light' as const,
        icon: <IconClock size={14} />,
        tooltip: texts.evals.evaluations.statusPendingTooltip,
      };
    case EvaluationStatus.Running:
      return {
        label: texts.evals.evaluations.statusRunning,
        color: 'blue',
        variant: 'filled' as const,
        icon: <Loader size={12} />,
        tooltip: texts.evals.evaluations.statusRunningTooltip,
      };
    case EvaluationStatus.Success:
      return {
        label: texts.evals.evaluations.statusSuccess,
        color: 'green',
        variant: 'filled' as const,
        icon: <IconCheck size={14} />,
        tooltip: texts.evals.evaluations.statusSuccessTooltip,
      };
    case EvaluationStatus.Failure:
      return {
        label: texts.evals.evaluations.statusFailure,
        color: 'red',
        variant: 'filled' as const,
        icon: <IconAlertTriangle size={14} />,
        tooltip: texts.evals.evaluations.statusFailureTooltip,
      };
    default:
      return {
        label: String(status),
        color: 'gray',
        variant: 'light' as const,
        icon: null,
        tooltip: null,
      };
  }
}
