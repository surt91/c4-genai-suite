import { Badge, Box, Button, Card, Flex, Group, Skeleton, Stack } from '@mantine/core';
import { IconArrowLeft, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Page } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import classes from './MetricDetailPage.module.css';
import { MetricTypeChip } from './components/MetricTypeChip';
import { DeleteMetricDialog } from './dialogs/DeleteMetricDialog';
import { UpdateMetricDialog } from './dialogs/UpsertMetricDialog';
import { useMetric } from './hooks/useMetricQueries';

export function MetricDetailPage() {
  const { metricId } = useParams<{ metricId: string }>();
  const navigate = useNavigate();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: metric, isLoading, isError, refetch } = useMetric(metricId);

  const handleBack = useEventCallback(() => {
    void navigate('/admin/evals/metrics');
  });

  const handleEdit = useEventCallback(() => {
    setShowEditDialog(true);
  });

  const handleCloseEditDialog = useEventCallback(() => {
    setShowEditDialog(false);
  });

  const handleUpdated = useEventCallback(() => {
    void refetch();
  });

  const handleDelete = useEventCallback(() => {
    setShowDeleteDialog(true);
  });

  const handleCloseDeleteDialog = useEventCallback(() => {
    setShowDeleteDialog(false);
  });

  const handleDeleted = useEventCallback(() => {
    void navigate('/admin/evals/metrics');
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isError) {
    return (
      <Page>
        <Box mb={16}>
          <Button variant="subtle" leftSection={<IconArrowLeft />} onClick={handleBack}>
            {texts.evals.metrics}
          </Button>
        </Box>
        <Alert text={texts.evals.metric.loadFailed} />
      </Page>
    );
  }

  if (isLoading || !metric) {
    return (
      <Page>
        <Box mb={16}>
          <Button variant="subtle" leftSection={<IconArrowLeft />} onClick={handleBack}>
            {texts.evals.metrics}
          </Button>
        </Box>
        <Skeleton height={40} mb={16} />
        <Skeleton height={200} mb={16} />
        <Skeleton height={200} />
      </Page>
    );
  }

  const config = metric._configuration;
  const isGEval = config.type === 'G_EVAL';
  const isSimpleMetric = config.type === 'ANSWER_RELEVANCY' || config.type === 'FAITHFULNESS' || config.type === 'HALLUCINATION';

  return (
    <>
      <Page>
        {/* Breadcrumb */}
        <Box mb={16}>
          <Button variant="subtle" leftSection={<IconArrowLeft />} onClick={handleBack}>
            {texts.evals.metrics}
          </Button>
        </Box>

        {/* Header */}
        <Group justify="space-between" mb={16} wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <h2 className={classes.title}>{config.name}</h2>
            <MetricTypeChip type={config.type} />
          </Group>

          <Flex gap={8}>
            <Button variant="light" leftSection={<IconPencil />} onClick={handleEdit}>
              {texts.common.edit}
            </Button>
            <Button variant="light" color="red" leftSection={<IconTrash />} onClick={handleDelete}>
              {texts.common.remove}
            </Button>
          </Flex>
        </Group>

        {/* Overview Section */}
        <Card shadow="xs" radius="md" padding={24} mb={16}>
          <h3 className={classes.sectionTitle}>{texts.evals.metric.overview}</h3>
          <div className={classes.overview}>
            <div>
              <p className={classes.label}>{texts.evals.metric.type}</p>
              <div className={classes.value}>
                <MetricTypeChip type={config.type} />
              </div>
            </div>
            <div>
              <p className={classes.label}>{texts.evals.metric.createdAt}</p>
              <p className={classes.value}>{formatDate(metric.createdAt)}</p>
            </div>
            <div>
              <p className={classes.label}>{texts.evals.metric.updatedAt}</p>
              <p className={classes.value}>{formatDate(metric.updatedAt)}</p>
            </div>
          </div>
        </Card>

        {/* Configuration Section */}
        <Card shadow="xs" radius="md" padding={24} mb={16}>
          <h3 className={classes.sectionTitle}>{texts.evals.metric.configuration}</h3>
          <Stack gap={12}>
            <div>
              <p className={classes.label}>{texts.evals.metric.nameLabel}</p>
              <p className={classes.value}>{config.name}</p>
            </div>

            <div>
              <p className={classes.label}>{texts.evals.metric.thresholdLabel}</p>
              <p className={classes.value}>{config.threshold.toFixed(2)}</p>
            </div>

            <div>
              <p className={classes.label}>{texts.evals.metric.chatModelLabel}</p>
              <p className={classes.value}>{config.chatModelId}</p>
            </div>

            <div>
              <p className={classes.label}>{texts.evals.metric.strictModeLabel}</p>
              <p className={classes.value}>{config.strictMode ? texts.common.yes : texts.common.no}</p>
            </div>

            {isSimpleMetric && (
              <div>
                <p className={classes.label}>{texts.evals.metric.includeReasonLabel}</p>
                <p className={classes.value}>{config.includeReason ? texts.common.yes : texts.common.no}</p>
              </div>
            )}

            {isGEval && (
              <>
                <div>
                  <p className={classes.label}>{texts.evals.metric.evaluationStepsLabel}</p>
                  <ol className={classes.steps}>
                    {config.evaluationSteps.map((step: string, index: number) => (
                      <li key={index} className={classes.value}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <p className={classes.label}>{texts.evals.metric.evaluationParamsLabel}</p>
                  <Flex mt={4} wrap="wrap" gap={8}>
                    {config.evaluationParams.map((param: string) => (
                      <Badge key={param} component="span" variant="outline" color="dark" tt="none">
                        {param}
                      </Badge>
                    ))}
                  </Flex>
                </div>
              </>
            )}
          </Stack>
        </Card>

        {/* Usage Section (placeholder) */}
        <Card shadow="xs" radius="md" padding={24}>
          <h3 className={classes.sectionTitle}>{texts.evals.metric.usage}</h3>
          <p className={classes.empty}>{texts.evals.metric.noEvaluationsUsing}</p>
        </Card>
      </Page>

      {showEditDialog && metric && (
        <UpdateMetricDialog target={metric} onClose={handleCloseEditDialog} onUpdate={handleUpdated} onDelete={handleDeleted} />
      )}

      {showDeleteDialog && metric && (
        <DeleteMetricDialog metric={metric} onClose={handleCloseDeleteDialog} onDeleted={handleDeleted} />
      )}
    </>
  );
}
