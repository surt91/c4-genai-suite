import { Card, Group, Radio, Stack, Text } from '@mantine/core';
import { IconDatabase, IconEdit } from '@tabler/icons-react';
import { type EvaluationMode, useWizardStore } from '../../state/zustand/wizardState';
import classes from './SelectableCard.module.css';

export function ModeSelectionStep() {
  const { mode, setMode } = useWizardStore();

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Select Evaluation Mode
      </Text>
      <Text size="sm" c="dimmed">
        Choose how you want to create your evaluation
      </Text>

      <Radio.Group value={mode || ''} onChange={(value) => setMode(value as EvaluationMode)}>
        <Stack gap="md">
          <Card
            padding="md"
            withBorder
            className={classes.card}
            data-selected={mode === 'catalog' || undefined}
            onClick={() => setMode('catalog')}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio value="catalog" />
              <Stack gap="xs" flex={1}>
                <Group gap="xs">
                  <IconDatabase size={20} color="var(--mantine-color-blue-8)" />
                  <Text fw={600}>By QA Catalog</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Use an existing QA catalog to run evaluations. Test cases will be automatically generated from the
                  catalog&apos;s Q&A pairs.
                </Text>
              </Stack>
            </Group>
          </Card>

          <Card
            padding="md"
            withBorder
            className={classes.card}
            data-selected={mode === 'manual' || undefined}
            onClick={() => setMode('manual')}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio value="manual" />
              <Stack gap="xs" flex={1}>
                <Group gap="xs">
                  <IconEdit size={20} color="var(--mantine-color-green-8)" />
                  <Text fw={600}>Manual Test Cases</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Create an evaluation by manually defining test cases. Useful for custom scenarios or when you don&apos;t have a
                  QA catalog yet.
                </Text>
              </Stack>
            </Group>
          </Card>
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
