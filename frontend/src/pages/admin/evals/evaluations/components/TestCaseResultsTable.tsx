import { ActionIcon, Badge, Box, Group, Paper, Skeleton, Stack, Table, Text, Tooltip } from '@mantine/core';
import {
  IconArrowsSort,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import { Fragment, useMemo, useState } from 'react';
import type { EvaluationDetailSummaryMetric, GroupedEvaluationResult } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import tableClasses from './DataTable.module.css';

interface TestCaseResultsTableProps {
  results: GroupedEvaluationResult[];
  metrics: EvaluationDetailSummaryMetric[];
  isFetching: boolean;
  isFetched: boolean;
}

// Processed QA pair row for display
interface QaPairRow {
  key: string;
  input: string;
  expectedOutput: string;
  allPassed: boolean;
  testCaseCount: number;
  passedCount: number;
  failedCount: number;
  testCases: TestCaseDetail[];
}

// Detail for each test case iteration
interface TestCaseDetail {
  id: string;
  index: number;
  status: string;
  allPassed: boolean;
  metricResults: MetricResultDetail[];
}

// Individual metric result
interface MetricResultDetail {
  metricId: string;
  metricName: string;
  score: number | null;
  threshold: number | null;
  success: boolean;
}

type SortOrder = 'none' | 'passed-first' | 'failed-first';

export function TestCaseResultsTable({ results, metrics, isFetching, isFetched }: TestCaseResultsTableProps) {
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Sort state
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');

  // Create a map of metric ID to metric name
  const metricMap = useMemo(() => new Map(metrics.map((m) => [m.id, m.name])), [metrics]);

  // Process results into QA pair rows with nested test cases
  const qaPairRows: QaPairRow[] = useMemo(() => {
    return results.map((result, resultIndex) => {
      const key = result.groupingKey || `result-${resultIndex}`;

      const testCases: TestCaseDetail[] = result.testCases.map((tc) => {
        const metricResults: MetricResultDetail[] = tc.results.map((mr) => ({
          metricId: mr.metricId,
          metricName: metricMap.get(mr.metricId) || mr.metricId,
          score: mr.score,
          threshold: mr.threashold, // API has typo
          success: mr.success,
        }));

        const allMetricsPassed = metricResults.every((mr) => mr.success);

        return {
          id: tc.id,
          index: tc.index,
          status: tc.testCaseStatus,
          allPassed: allMetricsPassed,
          metricResults,
        };
      });

      const passedCount = testCases.filter((tc) => tc.allPassed).length;
      const failedCount = testCases.length - passedCount;
      const allPassed = failedCount === 0;

      return {
        key,
        input: result.input,
        expectedOutput: result.expectedOutput,
        allPassed,
        testCaseCount: testCases.length,
        passedCount,
        failedCount,
        testCases,
      };
    });
  }, [results, metricMap]);

  // Sort QA pair rows based on sort order
  const sortedRows = useMemo(() => {
    if (sortOrder === 'none') return qaPairRows;

    return [...qaPairRows].sort((a, b) => {
      if (sortOrder === 'passed-first') {
        if (a.allPassed && !b.allPassed) return -1;
        if (!a.allPassed && b.allPassed) return 1;
      } else if (sortOrder === 'failed-first') {
        if (!a.allPassed && b.allPassed) return -1;
        if (a.allPassed && !b.allPassed) return 1;
      }
      return 0;
    });
  }, [qaPairRows, sortOrder]);

  // Get score color based on value
  const getScoreColor = (score: number | null): 'red' | 'orange' | 'teal' | 'gray' => {
    if (score === null) return 'gray';
    if (score < 0.5) return 'red';
    if (score < 0.8) return 'orange';
    return 'teal';
  };

  // Cycle through sort orders: none -> passed-first -> failed-first -> none
  const cycleSortOrder = () => {
    setSortOrder((prev) => {
      if (prev === 'none') return 'passed-first';
      if (prev === 'passed-first') return 'failed-first';
      return 'none';
    });
  };

  const getSortIcon = () => {
    if (sortOrder === 'none') return <IconArrowsSort size={14} />;
    if (sortOrder === 'passed-first') return <IconSortAscending size={14} />;
    return <IconSortDescending size={14} />;
  };

  const getSortTooltip = () => {
    if (sortOrder === 'none') return texts.evals.evaluations.results.sortByStatus;
    if (sortOrder === 'passed-first') return texts.evals.evaluations.results.passedFirst;
    return texts.evals.evaluations.results.failedFirst;
  };

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Stack gap="md">
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className={tableClasses.table}>
          <thead>
            <tr>
              <th style={{ width: '2.5rem' }}></th>
              <th>
                <Group gap="xs" wrap="nowrap">
                  <span>{texts.evals.evaluations.results.status}</span>
                  <Tooltip label={getSortTooltip()} withArrow>
                    <ActionIcon
                      variant={sortOrder !== 'none' ? 'light' : 'subtle'}
                      color={sortOrder !== 'none' ? 'blue' : 'gray'}
                      size="sm"
                      aria-label={getSortTooltip()}
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleSortOrder();
                      }}
                    >
                      {getSortIcon()}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </th>
              <th>{texts.evals.evaluations.results.question}</th>
              <th>{texts.evals.evaluations.results.expectedOutput}</th>
              <th>{texts.evals.evaluations.results.iterations}</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading state */}
            {isFetching && !isFetched && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <Skeleton height={20} width={24} />
                    </td>
                    <td>
                      <Skeleton height={20} width={70} />
                    </td>
                    <td>
                      <Skeleton height={20} />
                    </td>
                    <td>
                      <Skeleton height={20} />
                    </td>
                    <td>
                      <Skeleton height={20} width={80} />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Data rows */}
            {isFetched &&
              sortedRows.map((row) => {
                const isExpanded = expandedRows.has(row.key);

                return (
                  <Fragment key={row.key}>
                    {/* Main QA pair row */}
                    <tr key={row.key} className={tableClasses.clickableRow} onClick={() => toggleRow(row.key)}>
                      <td>
                        <ActionIcon variant="subtle" size="sm">
                          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </ActionIcon>
                      </td>
                      <td>
                        <Badge
                          variant={row.allPassed ? 'light' : 'filled'}
                          color={row.allPassed ? 'teal' : 'red'}
                          leftSection={row.allPassed ? <IconCheck size={12} /> : <IconX size={12} />}
                          size="sm"
                        >
                          {row.allPassed ? texts.evals.evaluations.passed : texts.evals.evaluations.failed}
                        </Badge>
                      </td>
                      <td>
                        <Tooltip label={row.input} multiline maw={400} withArrow>
                          <Text size="sm" lineClamp={2} style={{ cursor: 'help' }}>
                            {row.input}
                          </Text>
                        </Tooltip>
                      </td>
                      <td>
                        <Tooltip label={row.expectedOutput} multiline maw={400} withArrow>
                          <Text size="sm" lineClamp={2} style={{ cursor: 'help' }}>
                            {row.expectedOutput}
                          </Text>
                        </Tooltip>
                      </td>
                      <td>
                        <Group gap="xs">
                          <Badge variant="light" color="teal" size="sm">
                            {texts.evals.evaluations.results.passedCount(row.passedCount)}
                          </Badge>
                          {row.failedCount > 0 && (
                            <Badge variant="light" color="red" size="sm">
                              {texts.evals.evaluations.results.failedCount(row.failedCount)}
                            </Badge>
                          )}
                        </Group>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr key={`${row.key}-expanded`}>
                        <td colSpan={5} className={tableClasses.details}>
                          <Box p="md">
                            <Stack gap="md">
                              {row.testCases.map((tc) => (
                                <Paper key={tc.id} withBorder radius="md" p={12}>
                                  <Group justify="space-between" mb="sm">
                                    <Group gap="sm">
                                      <Text size="sm" fw={500}>
                                        {texts.evals.evaluations.results.iteration(tc.index + 1)}
                                      </Text>
                                      <Badge
                                        variant={tc.allPassed ? 'light' : 'filled'}
                                        color={tc.allPassed ? 'teal' : 'red'}
                                        size="xs"
                                      >
                                        {tc.allPassed
                                          ? texts.evals.evaluations.results.allPassed
                                          : texts.evals.evaluations.results.hasFailures}
                                      </Badge>
                                    </Group>
                                  </Group>

                                  <Table withTableBorder={false} verticalSpacing="xs" horizontalSpacing="sm">
                                    <Table.Thead>
                                      <Table.Tr>
                                        <Table.Th>{texts.evals.evaluations.results.metric}</Table.Th>
                                        <Table.Th>{texts.evals.evaluations.results.score}</Table.Th>
                                        <Table.Th>{texts.evals.evaluations.results.threshold}</Table.Th>
                                        <Table.Th>{texts.evals.evaluations.results.status}</Table.Th>
                                      </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                      {tc.metricResults.map((mr) => (
                                        <Table.Tr key={mr.metricId}>
                                          <Table.Td>
                                            <Badge variant="default" size="sm">
                                              {mr.metricName}
                                            </Badge>
                                          </Table.Td>
                                          <Table.Td>
                                            <Badge variant="light" color={getScoreColor(mr.score)} size="sm">
                                              {mr.score !== null ? mr.score.toFixed(3) : texts.evals.wizard.metrics.notAvailable}
                                            </Badge>
                                          </Table.Td>
                                          <Table.Td>
                                            <Text size="sm" c="dimmed">
                                              {mr.threshold !== null ? mr.threshold.toFixed(3) : '-'}
                                            </Text>
                                          </Table.Td>
                                          <Table.Td>
                                            <Badge
                                              variant={mr.success ? 'light' : 'filled'}
                                              color={mr.success ? 'teal' : 'red'}
                                              leftSection={mr.success ? <IconCheck size={10} /> : <IconX size={10} />}
                                              size="xs"
                                            >
                                              {mr.success ? texts.evals.evaluations.passed : texts.evals.evaluations.failed}
                                            </Badge>
                                          </Table.Td>
                                        </Table.Tr>
                                      ))}
                                    </Table.Tbody>
                                  </Table>
                                </Paper>
                              ))}
                            </Stack>
                          </Box>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

            {/* Empty state */}
            {isFetched && qaPairRows.length === 0 && (
              <tr>
                <td colSpan={5} className={tableClasses.empty}>
                  <div>
                    <Text mb={8}>{texts.evals.evaluations.results.empty}</Text>
                    <Text fz="sm">{texts.evals.evaluations.results.emptyHint}</Text>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}
