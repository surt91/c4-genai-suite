import { Box, Button, Card, Group, TextInput, Title } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetAllEvaluationResult } from 'src/api/generated-eval';
import { Page } from 'src/components';
import { useDebounce } from 'src/hooks/utils';
import { texts } from 'src/texts';
import { CreateEvaluationDialog } from './CreateEvaluationDialog';
import { EvaluationsTable } from './components/EvaluationsTable';
import { useEvaluations } from './hooks/useEvaluationQueries';

export function EvaluationsPage() {
  const navigate = useNavigate();
  const [page, _setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: evaluations = [], isFetching, isFetched } = useEvaluations(page, 20, debouncedSearch || undefined);

  const handleRowClick = (evaluation: GetAllEvaluationResult) => {
    void navigate(`/admin/evals/evaluations/${evaluation.id}`);
  };

  return (
    <Page>
      <Group justify="space-between" wrap="nowrap" mb={16}>
        <Title order={2} fz={30} lh="2.25rem" fw={400}>
          {texts.evals.evaluations.title}
        </Title>

        <Group gap={16} wrap="nowrap">
          <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
            {texts.evals.evaluations.create}
          </Button>
        </Group>
      </Group>

      <Box mb={16}>
        <TextInput
          placeholder={texts.evals.evaluations.searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maw="28rem"
        />
      </Box>

      <Card shadow="xs" padding={24} radius="md">
        <EvaluationsTable evaluations={evaluations} isFetching={isFetching} isFetched={isFetched} onRowClick={handleRowClick} />
      </Card>

      {showCreateDialog && (
        <CreateEvaluationDialog onClose={() => setShowCreateDialog(false)} onCreate={() => setShowCreateDialog(false)} />
      )}
    </Page>
  );
}
