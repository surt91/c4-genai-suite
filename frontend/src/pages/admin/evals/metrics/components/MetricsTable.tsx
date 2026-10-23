import { ActionIcon, Group, Skeleton, Table, Text } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { Metric } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import classes from '../../EvalTable.module.css';
import { MetricTypeChip } from './MetricTypeChip';

interface MetricsTableProps {
  metrics: Metric[];
  isFetching: boolean;
  isFetched: boolean;
  onRowClick: (metric: Metric) => void;
  onEdit: (metric: Metric) => void;
  onDelete: (metric: Metric) => void;
  isDeleting?: string; // ID of the metric being deleted
}

export function MetricsTable({ metrics, isFetching, isFetched, onRowClick, onEdit, onDelete, isDeleting }: MetricsTableProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Table layout="fixed" fz="md" verticalSpacing={12} horizontalSpacing={16} highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{texts.evals.metric.name}</Table.Th>
          <Table.Th w={192}>{texts.evals.metric.type}</Table.Th>
          <Table.Th w={128}>{texts.evals.metric.threshold}</Table.Th>
          <Table.Th w={192}>{texts.evals.metric.chatModel}</Table.Th>
          <Table.Th w={144}>{texts.evals.metric.createdAt}</Table.Th>
          <Table.Th w={112}>{texts.evals.metric.actions}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {isFetching &&
          !isFetched &&
          Array.from({ length: 5 }).map((_, i) => (
            <Table.Tr key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <Table.Td key={j}>
                  <Skeleton height={20} />
                </Table.Td>
              ))}
            </Table.Tr>
          ))}

        {isFetched &&
          metrics.map((metric) => (
            <Table.Tr className={classes.clickableRow} key={metric.id} onClick={() => onRowClick(metric)}>
              <Table.Td className={classes.nameCell}>{metric._configuration.name}</Table.Td>
              <Table.Td className={classes.cell}>
                <MetricTypeChip type={metric._configuration.type} />
              </Table.Td>
              <Table.Td className={classes.cell}>{metric._configuration.threshold.toFixed(2)}</Table.Td>
              <Table.Td className={classes.truncatedCell} fz="sm">
                {metric._configuration.chatModelId}
              </Table.Td>
              <Table.Td className={classes.cell}>{formatDate(metric.createdAt)}</Table.Td>
              <Table.Td className={classes.cell}>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    color="dark"
                    size={32}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(metric);
                    }}
                    disabled={isDeleting === metric.id}
                    aria-label={texts.common.edit}
                  >
                    <IconPencil size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size={32}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(metric);
                    }}
                    disabled={isDeleting === metric.id}
                    aria-label={texts.common.remove}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}

        {isFetched && metrics.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={6} className={classes.emptyCell}>
              <div>
                <Text mb={8} inherit>
                  {texts.evals.metric.empty}
                </Text>
                <Text fz="sm" c="inherit">
                  {texts.evals.metric.emptyHint}
                </Text>
              </div>
            </Table.Td>
          </Table.Tr>
        )}
      </Table.Tbody>
    </Table>
  );
}
