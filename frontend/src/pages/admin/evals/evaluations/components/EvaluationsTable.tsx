import { Badge, Skeleton, Text } from '@mantine/core';
import { clsx } from 'clsx';
import type { GetAllEvaluationResult } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import tableClasses from './DataTable.module.css';
import { EvaluationProgressBar } from './EvaluationProgressBar';
import { EvaluationStatusChip } from './EvaluationStatusChip';

interface EvaluationsTableProps {
  evaluations: GetAllEvaluationResult[];
  isFetching: boolean;
  isFetched: boolean;
  onRowClick: (evaluation: GetAllEvaluationResult) => void;
}

export function EvaluationsTable({ evaluations, isFetching, isFetched, onRowClick }: EvaluationsTableProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMetricsCount = (evaluation: GetAllEvaluationResult) => {
    return evaluation.metricResults?.length || 0;
  };

  return (
    <table className={clsx(tableClasses.table, tableClasses.fixed)}>
      <thead>
        <tr>
          <th>{texts.evals.evaluations.name}</th>
          <th style={{ width: '12rem' }}>{texts.evals.evaluations.qaCatalog}</th>
          <th style={{ width: '6rem' }}>{texts.evals.evaluations.metrics}</th>
          <th style={{ width: '8rem' }}>{texts.evals.evaluations.status}</th>
          <th style={{ width: '12rem' }}>{texts.evals.evaluations.progress}</th>
          <th style={{ width: '10rem' }}>{texts.evals.evaluations.createdAt}</th>
        </tr>
      </thead>
      <tbody>
        {isFetching && !isFetched && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
              </tr>
            ))}
          </>
        )}

        {isFetched &&
          evaluations.map((evaluation) => (
            <tr className={tableClasses.clickableRow} key={evaluation.id} onClick={() => onRowClick(evaluation)}>
              <td className={tableClasses.truncate} style={{ fontWeight: 600 }}>
                {evaluation.name}
              </td>
              <td className={tableClasses.truncate}>
                {evaluation.catalog ? (
                  <Text span fz="sm">
                    {evaluation.catalog.name}
                  </Text>
                ) : (
                  <Text span fz="xs" c="dark.3">
                    {texts.evals.evaluations.manualTestCases}
                  </Text>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                <Badge component="span" size="sm" variant="default" tt="none" fw={400}>
                  {getMetricsCount(evaluation)}
                </Badge>
              </td>
              <td style={{ overflow: 'hidden' }}>
                <EvaluationStatusChip status={evaluation.status} />
              </td>
              <td style={{ overflow: 'hidden' }}>
                <EvaluationProgressBar progress={evaluation.testCaseProgress} showLabel={false} />
                <Text component="div" mt={4} fz="xs" lh="1rem" c="gray.7">
                  {evaluation.testCaseProgress.done} / {evaluation.testCaseProgress.total}
                </Text>
              </td>
              <td style={{ overflow: 'hidden' }} className={tableClasses.small}>
                {formatDate(evaluation.createdAt)}
              </td>
            </tr>
          ))}

        {isFetched && evaluations.length === 0 && (
          <tr>
            <td colSpan={6} className={tableClasses.empty}>
              <div>
                <Text mb={8}>{texts.evals.evaluations.empty}</Text>
                <Text fz="sm">{texts.evals.evaluations.emptyHint}</Text>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
