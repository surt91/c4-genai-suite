import { Alert, Badge, Card, Group, Radio, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRobot } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { ConfigurationDto } from 'src/api/generated';
import { useApi } from 'src/api/state/apiAppClient';
import { texts } from 'src/texts';
import { useWizardStore } from '../../state/zustand/wizardState';
import classes from './SelectableCard.module.css';

export function AssistantSelectionStep() {
  const { gaibleAssistantId, setGaibleAssistant } = useWizardStore();
  const api = useApi();
  const t = texts.evals.wizard.assistant;

  // Fetch the configurations (assistants)
  const {
    data: configurations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['configurations', 'all', true],
    queryFn: () => api.extensions.getConfigurations(true),
  });

  const assistants: ConfigurationDto[] = configurations?.items ?? [];

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

  if (isError || assistants.length === 0) {
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

      {!gaibleAssistantId && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          {t.selectOne}
        </Alert>
      )}

      <Radio.Group
        value={gaibleAssistantId?.toString() ?? ''}
        onChange={(value) => {
          const assistant = assistants.find((a) => a.id.toString() === value);
          setGaibleAssistant(assistant ? assistant.id : null, assistant?.name ?? null);
        }}
      >
        <Stack gap="md">
          {assistants.map((assistant) => (
            <Card
              key={assistant.id}
              padding="md"
              withBorder
              className={classes.card}
              data-selected={gaibleAssistantId === assistant.id || undefined}
              onClick={() => setGaibleAssistant(assistant.id, assistant.name)}
            >
              <Group wrap="nowrap" align="flex-start">
                <Radio value={assistant.id.toString()} aria-label={assistant.name} />
                <Stack gap="xs" flex={1}>
                  <Group gap="xs">
                    <IconRobot size={18} color="var(--mantine-color-blue-8)" />
                    <Text fw={600}>{assistant.name}</Text>
                  </Group>
                  {assistant.description && (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {assistant.description}
                    </Text>
                  )}
                  <Group gap="xs">
                    <Badge variant="light" size="sm" color="blue">
                      {t.badge}
                    </Badge>
                    {assistant.extensions && assistant.extensions.length > 0 && (
                      <Badge variant="outline" size="sm">
                        {t.extensions(assistant.extensions.length)}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
