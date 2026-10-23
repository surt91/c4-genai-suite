import { Badge, Card, Group, NumberInput, Select, Skeleton, Stack, Text } from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { texts } from 'src/texts';
import { useWizardStore } from '../../state/zustand/wizardState';

export function CatalogSelectionStep() {
  const { catalogId, setCatalogId, testCasesPerQaPair, setTestCasesPerQaPair } = useWizardStore();
  const evalApi = useEvalApi();
  const t = texts.evals.wizard.catalog;

  // Fetch QA catalogs (only READY ones)
  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ['qaCatalogs', 'all'],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetAll(undefined, 0, 100),
  });

  // Filter only READY catalogs
  const readyCatalogs = catalogs.filter((c) => c.status === 'READY');

  const selectedCatalog = readyCatalogs.find((c) => c.id === catalogId);

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        {t.title}
      </Text>
      <Text size="sm" c="dimmed">
        {t.hint}
      </Text>

      {isLoading ? (
        <Stack gap="sm">
          <Skeleton height={60} />
          <Skeleton height={40} />
        </Stack>
      ) : (
        <>
          <Select
            label={t.catalog}
            placeholder={t.catalogPlaceholder}
            required
            value={catalogId}
            onChange={(value) => setCatalogId(value)}
            data={readyCatalogs.map((catalog) => ({
              value: catalog.id,
              label: t.option(catalog.name, catalog.length),
            }))}
            searchable
            nothingFoundMessage={t.nothingFound}
          />

          {selectedCatalog && (
            <Card padding="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconDatabase size={18} color="var(--mantine-color-blue-8)" />
                  <Text fw={600}>{selectedCatalog.name}</Text>
                  <Badge variant="light" color="green">
                    {texts.evals.qaCatalog.statusReady}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {t.details(selectedCatalog.length, selectedCatalog.revision)}
                </Text>
              </Stack>
            </Card>
          )}

          <NumberInput
            label={t.testCasesPerPair}
            description={t.testCasesPerPairDescription}
            placeholder={t.testCasesPerPairPlaceholder}
            required
            min={1}
            max={10}
            value={testCasesPerQaPair}
            onChange={(value) => setTestCasesPerQaPair(Number(value) || 1)}
          />

          {selectedCatalog && testCasesPerQaPair && (
            <Card padding="sm" withBorder bg="blue.0">
              <Text size="sm" c="dimmed">
                {t.estimateBefore}{' '}
                <Text component="span" fw={700} c="blue">
                  {selectedCatalog.length * (testCasesPerQaPair || 1)}
                </Text>{' '}
                {t.estimateAfter}
              </Text>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
