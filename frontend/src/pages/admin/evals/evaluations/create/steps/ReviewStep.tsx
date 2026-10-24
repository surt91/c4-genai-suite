import { Badge, Card, Divider, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconChartBar, IconDatabase, IconEdit, IconRobot } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { texts } from 'src/texts';
import { useWizardStore } from '../../state/zustand/wizardState';

export function ReviewStep() {
  const {
    mode,
    name,
    description,
    setName,
    setDescription,
    catalogId,
    testCasesPerQaPair,
    testCases,
    metricIds,
    gaibleAssistantId,
    gaibleAssistantName,
  } = useWizardStore();

  const evalApi = useEvalApi();
  const t = texts.evals.wizard.review;

  // Fetch selected resources for display (use preview to get length)
  const { data: catalog } = useQuery({
    queryKey: ['qaCatalogPreview', catalogId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetPreview({ catalog_id: catalogId! }),
    enabled: !!catalogId && mode === 'catalog',
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['metrics', 'all'],
    queryFn: () => evalApi.metrics.metricsGetAll({ offset: 0, limit: 100 }),
  });

  const selectedMetrics = metrics.filter((m) => metricIds.includes(m.id));

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        {t.title}
      </Text>
      <Text size="sm" c="dimmed">
        {t.hint}
      </Text>

      {/* Evaluation Name */}
      <TextInput label={t.name} placeholder={t.namePlaceholder} required value={name} onChange={(e) => setName(e.target.value)} />

      <Textarea
        label={t.description}
        placeholder={t.descriptionPlaceholder}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        minRows={2}
      />

      <Divider />

      {/* Configuration Summary */}
      <Text fw={600} size="md">
        {t.summary}
      </Text>

      {/* Mode & Source */}
      <Card padding="md" withBorder>
        <Stack gap="xs">
          <Group gap="xs">
            {mode === 'catalog' ? (
              <IconDatabase size={18} color="var(--mantine-color-blue-8)" />
            ) : (
              <IconEdit size={18} color="var(--mantine-color-green-8)" />
            )}
            <Text fw={600}>{t.source}</Text>
          </Group>
          {mode === 'catalog' && catalog && (
            <>
              <Text size="sm">
                {t.catalog}{' '}
                <Text component="span" fw={600}>
                  {catalog.name}
                </Text>
              </Text>
              <Text size="sm">
                {t.pairs}{' '}
                <Text component="span" fw={600}>
                  {catalog.length ?? 0}
                </Text>
              </Text>
              <Text size="sm">
                {t.testCasesPerPair}{' '}
                <Text component="span" fw={600}>
                  {testCasesPerQaPair ?? 1}
                </Text>
              </Text>
              <Text size="sm" c="dimmed">
                {t.estimatedTestCases}{' '}
                <Text component="span" fw={600}>
                  {(catalog.length ?? 0) * (testCasesPerQaPair || 1)}
                </Text>
              </Text>
            </>
          )}
          {mode === 'manual' && (
            <Text size="sm">
              {t.manualTestCases}{' '}
              <Text component="span" fw={600}>
                {testCases.length}
              </Text>
            </Text>
          )}
        </Stack>
      </Card>

      {/* Metrics */}
      <Card padding="md" withBorder>
        <Stack gap="xs">
          <Group gap="xs">
            <IconChartBar size={18} color="var(--mantine-color-blue-8)" />
            <Text fw={600}>{t.metrics(selectedMetrics.length)}</Text>
          </Group>
          <Group gap="xs">
            {selectedMetrics.map((metric) => (
              <Badge key={metric.id} variant="light">
                {metric.configuration.name}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Card>

      {/* Assistant */}
      <Card padding="md" withBorder>
        <Stack gap="xs">
          <Group gap="xs">
            <IconRobot size={18} color="var(--mantine-color-blue-8)" />
            <Text fw={600}>{t.assistant}</Text>
          </Group>
          {gaibleAssistantId && (
            <>
              <Text size="sm">{gaibleAssistantName ?? t.assistantId(gaibleAssistantId)}</Text>
              <Badge variant="light" size="sm" color="blue">
                {texts.evals.wizard.assistant.badge}
              </Badge>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
