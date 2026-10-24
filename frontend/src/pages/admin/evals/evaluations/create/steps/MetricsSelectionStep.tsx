import { Alert, Badge, Card, Checkbox, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconChartBar } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { texts } from 'src/texts';
import { useWizardStore } from '../../state/zustand/wizardState';
import classes from './SelectableCard.module.css';

export function MetricsSelectionStep() {
  const { metricIds, addMetricId, removeMetricId } = useWizardStore();
  const evalApi = useEvalApi();
  const t = texts.evals.wizard.metrics;

  // Fetch available metrics
  const {
    data: metrics = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['metrics', 'all'],
    queryFn: () => evalApi.metrics.metricsGetAll({ offset: 0, limit: 100 }),
  });

  const handleToggleMetric = (metricId: string) => {
    if (metricIds.includes(metricId)) {
      removeMetricId(metricId);
    } else {
      addMetricId(metricId);
    }
  };

  if (isLoading) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          {t.title}
        </Text>
        <Stack gap="sm">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Stack>
      </Stack>
    );
  }

  if (isError || metrics.length === 0) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          {t.title}
        </Text>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title={isError ? t.loadFailedTitle : t.noneTitle}>
          {isError ? texts.evals.wizard.loadFailed : t.none}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        {t.title}
      </Text>
      <Text size="sm" c="dimmed">
        {t.hint}
      </Text>

      {metricIds.length === 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          {t.selectAtLeastOne}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {metrics.map((metric) => {
          const isSelected = metricIds.includes(metric.id);

          return (
            <Card
              key={metric.id}
              padding="md"
              withBorder
              className={classes.card}
              data-selected={isSelected || undefined}
              onClick={() => handleToggleMetric(metric.id)}
            >
              <Group wrap="nowrap" align="flex-start">
                <Checkbox
                  checked={isSelected}
                  onChange={() => handleToggleMetric(metric.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={metric.configuration.name}
                />
                <Stack gap="xs" flex={1}>
                  <Group gap="xs">
                    <IconChartBar size={18} color="var(--mantine-color-blue-8)" />
                    <Text fw={600}>{metric.configuration.name}</Text>
                  </Group>
                  <Badge variant="light" size="sm" color="gray">
                    {metric.configuration.type}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {t.threshold(metric.configuration.threshold?.toFixed(2) || t.notAvailable)}
                  </Text>
                </Stack>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      {metricIds.length > 0 && (
        <Card padding="sm" withBorder bg="blue.0">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={700} c="blue">
              {metricIds.length}
            </Text>{' '}
            {t.selected}
          </Text>
        </Card>
      )}
    </Stack>
  );
}
