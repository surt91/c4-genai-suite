import { Card, Group, Radio, Stack, Text } from '@mantine/core';
import { IconDatabase, IconEdit } from '@tabler/icons-react';
import { texts } from 'src/texts';
import { type EvaluationMode, useWizardStore } from '../../state/zustand/wizardState';
import classes from './SelectableCard.module.css';

export function ModeSelectionStep() {
  const { mode, setMode } = useWizardStore();
  const t = texts.evals.wizard.mode;

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        {t.title}
      </Text>
      <Text size="sm" c="dimmed">
        {t.hint}
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
                  <Text fw={600}>{t.catalog}</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {t.catalogDescription}
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
                  <Text fw={600}>{t.manual}</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {t.manualDescription}
                </Text>
              </Stack>
            </Group>
          </Card>
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
