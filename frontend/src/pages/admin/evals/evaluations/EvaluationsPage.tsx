import { Box, Button, Card, Group, TextInput, Title } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetAllEvaluationResult } from 'src/api/generated-eval';
import { Page, Pagination } from 'src/components';
import { useDebounce } from 'src/hooks/utils';
import { totalWithoutCount, useStepBackFromEmptyPage } from 'src/lib/pagination';
import { texts } from 'src/texts';
import { CreateEvaluationDialog } from './CreateEvaluationDialog';
import { EvaluationsTable } from './components/EvaluationsTable';
import { useEvaluations } from './hooks/useEvaluationQueries';

const PAGE_SIZE = 20;

export function EvaluationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: evaluations = [], isFetching, isFetched } = useEvaluations(page + 1, PAGE_SIZE, debouncedSearch || undefined);
  // e.g. after the last item of the last page has been deleted
  useStepBackFromEmptyPage(page, setPage, isFetched, evaluations.length);

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
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          maw="28rem"
        />
      </Box>

      <Card shadow="xs" padding={24} radius="md">
        <EvaluationsTable evaluations={evaluations} isFetching={isFetching} isFetched={isFetched} onRowClick={handleRowClick} />
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={totalWithoutCount(page, PAGE_SIZE, evaluations.length)}
          onPage={setPage}
        />
      </Card>

      {showCreateDialog && (
        <CreateEvaluationDialog onClose={() => setShowCreateDialog(false)} onCreate={() => setShowCreateDialog(false)} />
      )}
    </Page>
  );
}
