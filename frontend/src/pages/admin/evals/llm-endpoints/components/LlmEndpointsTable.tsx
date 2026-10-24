import { ActionIcon, Group, Skeleton, Table, Text } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { LLMEndpoint } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import classes from '../../EvalTable.module.css';
import { LlmEndpointFeaturesBadge } from './LlmEndpointFeaturesBadge';
import { LlmEndpointTypeChip } from './LlmEndpointTypeChip';

interface LlmEndpointsTableProps {
  endpoints: LLMEndpoint[];
  isFetching: boolean;
  isFetched: boolean;
  onRowClick: (endpoint: LLMEndpoint) => void;
  onEdit: (endpoint: LLMEndpoint) => void;
  onDelete: (endpoint: LLMEndpoint) => void;
  isDeleting?: boolean;
}

export function LlmEndpointsTable({
  endpoints,
  isFetching,
  isFetched,
  onRowClick,
  onEdit,
  onDelete,
  isDeleting,
}: LlmEndpointsTableProps) {
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
          <Table.Th>{texts.evals.llmEndpoint.name}</Table.Th>
          <Table.Th w={160}>{texts.evals.llmEndpoint.type}</Table.Th>
          <Table.Th w={192}>{texts.evals.llmEndpoint.features}</Table.Th>
          <Table.Th w={144}>{texts.evals.llmEndpoint.createdAt}</Table.Th>
          <Table.Th w={144}>{texts.evals.llmEndpoint.updatedAt}</Table.Th>
          <Table.Th w={112}>{texts.evals.llmEndpoint.actions}</Table.Th>
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
          endpoints.map((endpoint) => (
            <Table.Tr className={classes.clickableRow} key={endpoint.id} onClick={() => onRowClick(endpoint)}>
              <Table.Td className={classes.nameCell}>{endpoint.name}</Table.Td>
              <Table.Td className={classes.cell}>
                <LlmEndpointTypeChip type={endpoint.configuration.type} />
              </Table.Td>
              <Table.Td className={classes.cell}>
                <LlmEndpointFeaturesBadge features={endpoint.supportedFeatures} />
              </Table.Td>
              <Table.Td className={classes.cell}>{formatDate(endpoint.createdAt)}</Table.Td>
              <Table.Td className={classes.cell}>{formatDate(endpoint.updatedAt)}</Table.Td>
              <Table.Td className={classes.cell}>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    color="dark"
                    size={32}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(endpoint);
                    }}
                    disabled={isDeleting}
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
                      onDelete(endpoint);
                    }}
                    disabled={isDeleting}
                    aria-label={texts.common.remove}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}

        {isFetched && endpoints.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={6} className={classes.emptyCell}>
              <div>
                <Text mb={8} inherit>
                  {texts.evals.llmEndpoint.empty}
                </Text>
                <Text fz="sm" c="inherit">
                  {texts.evals.llmEndpoint.emptyHint}
                </Text>
              </div>
            </Table.Td>
          </Table.Tr>
        )}
      </Table.Tbody>
    </Table>
  );
}
