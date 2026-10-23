import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconEdit, IconTrash } from '@tabler/icons-react';
import type { QAPair } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import type { PendingChange } from '../state';
import classes from './QaPairsTable.module.css';

interface QaPairsTableProps {
  pairs: (QAPair & { _pendingStatus?: 'added' | 'updated' | 'deleted' })[];
  pendingChanges: PendingChange[];
  onEdit: (pair: QAPair) => void;
  onDelete: (pair: QAPair) => void;
  onUndo: (pairId: string) => void;
}

export function QaPairsTable({ pairs, pendingChanges, onEdit, onDelete, onUndo }: QaPairsTableProps) {
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const isPending = (pairId: string) => {
    return pendingChanges.some((c) => {
      if (c.type === 'addition') return c.tempId === pairId;
      return c.id === pairId;
    });
  };

  return (
    <table className={classes.table}>
      <thead>
        <tr className={classes.headRow}>
          <th style={{ width: '35%' }}>{texts.evals.qaCatalog.question}</th>
          <th style={{ width: '35%' }}>{texts.evals.qaCatalog.expectedOutput}</th>
          <th style={{ width: '15%' }}>{texts.evals.qaCatalog.contexts}</th>
          <th style={{ width: '15%' }}>{texts.evals.qaCatalog.actions}</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <tr key={pair.id} className={classes.row} data-pending-status={pair._pendingStatus}>
            <td className={classes.firstCell} data-pending-status={pair._pendingStatus}>
              <div className={classes.cellContent} data-deleted={pair._pendingStatus === 'deleted' || undefined}>
                <Tooltip label={pair.question} multiline w={400} disabled={pair.question.length <= 100}>
                  <span className={classes.text}>{truncate(pair.question, 100)}</span>
                </Tooltip>
              </div>
            </td>
            <td>
              <div className={classes.cellContent} data-deleted={pair._pendingStatus === 'deleted' || undefined}>
                <Tooltip label={pair.expectedOutput} multiline w={400} disabled={pair.expectedOutput.length <= 100}>
                  <span className={classes.text}>{truncate(pair.expectedOutput, 100)}</span>
                </Tooltip>
              </div>
            </td>
            <td>
              <div className={classes.cellContent} data-deleted={pair._pendingStatus === 'deleted' || undefined}>
                {pair.contexts.length > 0 ? (
                  <Tooltip label={pair.contexts.join('\n---\n')} multiline w={400}>
                    <span className={classes.contexts}>{texts.evals.qaCatalog.contextCount(pair.contexts.length)}</span>
                  </Tooltip>
                ) : (
                  <span className={classes.noContexts}>-</span>
                )}
              </div>
            </td>
            <td>
              <Group gap={4} wrap="nowrap">
                {pair._pendingStatus === 'deleted' ? (
                  <Tooltip label={texts.evals.qaCatalog.undoChange}>
                    <ActionIcon
                      variant="subtle"
                      size="lg"
                      color="orange"
                      c="orange.8"
                      data-action="undo"
                      onClick={() => onUndo(pair.id)}
                    >
                      <IconArrowBackUp size={18} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip label={texts.common.edit}>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        color="gray"
                        c="black"
                        data-action="edit"
                        onClick={() => onEdit(pair)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={texts.common.remove}>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        color="red"
                        c="red.7"
                        data-action="delete"
                        onClick={() => onDelete(pair)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                    {isPending(pair.id) && (
                      <Tooltip label={texts.evals.qaCatalog.undoChange}>
                        <ActionIcon
                          variant="subtle"
                          size="lg"
                          color="orange"
                          c="orange.8"
                          data-action="undo"
                          onClick={() => onUndo(pair.id)}
                        >
                          <IconArrowBackUp size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </>
                )}
              </Group>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
