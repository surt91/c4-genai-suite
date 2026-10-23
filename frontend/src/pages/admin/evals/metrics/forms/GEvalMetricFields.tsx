import { ActionIcon, Button, Flex, MultiSelect, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { SingleTurnParams } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { BaseMetricFields } from './BaseMetricFields';
import classes from './MetricFields.module.css';
import type { MetricFormValues } from './types';

interface GEvalMetricFieldsProps {
  form: UseFormReturnType<MetricFormValues>;
}

export function GEvalMetricFields({ form }: GEvalMetricFieldsProps) {
  // Options for evaluation parameters (SingleTurnParams)
  const evaluationParamsOptions = [
    { value: SingleTurnParams.Input, label: texts.evals.metric.paramInput },
    { value: SingleTurnParams.ActualOutput, label: texts.evals.metric.paramActualOutput },
    { value: SingleTurnParams.ExpectedOutput, label: texts.evals.metric.paramExpectedOutput },
    { value: SingleTurnParams.Context, label: texts.evals.metric.paramContext },
    { value: SingleTurnParams.RetrievalContext, label: texts.evals.metric.paramRetrievalContext },
    { value: SingleTurnParams.ToolsCalled, label: texts.evals.metric.paramToolsCalled },
    { value: SingleTurnParams.ExpectedTools, label: texts.evals.metric.paramExpectedTools },
  ];

  return (
    <>
      <BaseMetricFields form={form} />

      <div className={classes.field}>
        <label className={classes.label}>
          {texts.evals.metric.evaluationStepsLabel}
          <span className={classes.required}>*</span>
        </label>
        <p className={classes.hint}>{texts.evals.metric.evaluationStepsHint}</p>

        {form.values.evaluationSteps?.map((_, index) => (
          <Flex key={index} mb={8} gap={8}>
            <TextInput
              flex={1}
              placeholder={texts.evals.metric.evaluationStepPlaceholder}
              key={form.key(`evaluationSteps.${index}`)}
              {...form.getInputProps(`evaluationSteps.${index}`)}
            />
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => form.removeListItem('evaluationSteps', index)}
              disabled={(form.values.evaluationSteps?.length ?? 0) <= 1}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Flex>
        ))}

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => form.insertListItem('evaluationSteps', '')}
          mt={8}
        >
          {texts.evals.metric.addEvaluationStep}
        </Button>

        {form.errors.evaluationSteps && <p className={classes.error}>{form.errors.evaluationSteps}</p>}
      </div>

      <MultiSelect
        withAsterisk
        label={texts.evals.metric.evaluationParamsLabel}
        description={texts.evals.metric.evaluationParamsHint}
        data={evaluationParamsOptions}
        mb={16}
        key={form.key('evaluationParams')}
        {...form.getInputProps('evaluationParams')}
      />
    </>
  );
}
