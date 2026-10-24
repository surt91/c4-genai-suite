import { Button, Group, MultiSelect, NumberInput, Portal, Select, Textarea, TextInput } from '@mantine/core';
import { useForm, UseFormReturnType } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { BUCKET_TYPES, BucketDto, BucketDtoFileSizeLimits, UpsertBucketDto, useApi } from 'src/api';
import { FormAlert, Icon, Modal } from 'src/components';
import { texts } from 'src/texts';
import { TestButton } from './TestButton';
import classes from './UpsertBucketDialog.module.css';

function debounce<F extends (...args: never[]) => void>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function (...args: Parameters<F>) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

const createScheme = () =>
  z.object({
    name: z.string().min(1, texts.common.name),
    endpoint: z.string().min(1, texts.common.endpoint),
    allowedFileNameExtensions: z.array(z.string()).min(1),
  });

interface UpsertBucketDialogProps {
  // The bucket to update.
  target?: BucketDto | null;

  // Invoked when cancelled.
  onClose: () => void;

  // Invoked when created.
  onCreate: (bucket: BucketDto) => void;

  // Invoked when updated.
  onUpdate: (bucket: BucketDto) => void;
}

export function UpsertBucketDialog(props: UpsertBucketDialogProps) {
  const { onClose, onCreate, onUpdate, target } = props;

  const api = useApi();

  const creating = useMutation({
    mutationFn: (request: UpsertBucketDto) => {
      return api.files.postBucket({ upsertBucketDto: request });
    },
    onSuccess: (response) => {
      onCreate(response);
      onClose();
    },
  });

  const updating = useMutation({
    mutationFn: (request: UpsertBucketDto) => {
      return api.files.putBucket({ id: target!.id, upsertBucketDto: request });
    },
    onSuccess: (response) => {
      onUpdate(response);
      onClose();
    },
    // the error is shown in the dialog (like for creating)
  });

  const form = useForm<UpsertBucketDto>({
    validate: zod4Resolver(createScheme()),
    initialValues: (target as UpsertBucketDto) ?? {
      name: '',
      endpoint: '',
      indexName: '',
      headers: '',
      isDefault: false,
      perUserQuota: 20,
      allowedFileNameExtensions: [],
      fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
    },
    mode: 'controlled',
  });

  const watchIsUser = form.getValues().type === 'user';

  const [{ endpoint, headers }, setConnection] = useState(target ?? { endpoint: '', headers: '' });

  const { data: fileTypes, error: fileTypesFetchError } = useQuery({
    queryKey: [`fileTypes:${endpoint}:${headers}`],
    queryFn: () => api.files.getFileTypes({ endpoint, headers }),
    enabled: !!endpoint,
    retry: false,
  });

  const bucketTypeOptions = BUCKET_TYPES.map((value) => ({ label: value, value }));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceFn = useMemo(() => debounce(handleDebounceFn, 500), []);

  function handleDebounceFn(key: string, newValue: string) {
    // the debounced function is created once, it must not use the values of the first render
    setConnection((previous) => ({ ...previous, [key]: newValue }));
    form.setFieldValue('allowedFileNameExtensions', []);
  }

  function handleEndpointChange(newValue: string) {
    form.setFieldValue('endpoint', newValue);
    debounceFn('endpoint', newValue);
  }

  function handleHeadersChange(newValue: string) {
    form.setFieldValue('headers', newValue);
    debounceFn('headers', newValue);
  }

  useEffect(() => {
    if (fileTypesFetchError) {
      form.setFieldError('endpoint', texts.files.invalidEndpointError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileTypesFetchError]);

  useEffect(() => {
    const allowedFileNameExtensions = form.getValues().allowedFileNameExtensions;
    if (!allowedFileNameExtensions?.length) {
      form.clearFieldError('endpoint');
      form.setFieldValue('allowedFileNameExtensions', fileTypes?.items.map((x) => x.value) ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileTypes]);

  const isDisabled = !form.isValid() || creating.isPending || updating.isPending;

  return (
    <Portal>
      <form onSubmit={form.onSubmit((v) => (target ? updating.mutate(v) : creating.mutate(v)))}>
        <Modal
          onClose={onClose}
          header={<div className={classes.header}>{target ? texts.files.updateBucket : texts.files.createBucket}</div>}
          footer={
            <fieldset disabled={updating.isPending || creating.isPending}>
              <Group justify="space-between" wrap="nowrap" align="stretch">
                <TestButton form={form} />
                <Group gap={8} wrap="nowrap" align="stretch">
                  <Button type="button" variant={'subtle'} onClick={onClose}>
                    {texts.common.cancel}
                  </Button>
                  <Button type="submit" disabled={isDisabled}>
                    {texts.common.save}
                  </Button>
                </Group>
              </Group>
            </fieldset>
          }
        >
          <fieldset disabled={updating.isPending || creating.isPending}>
            <FormAlert
              common={target ? texts.files.updateBucketFailed : texts.files.createBucketFailed}
              error={target ? updating.error : creating.error}
            />

            <TextInput
              id="name"
              label={texts.common.name}
              autoFocus
              required
              key={form.key('name')}
              {...form.getInputProps('name')}
              mb="sm"
            />

            <TextInput
              id="indexName"
              label={texts.common.indexName}
              placeholder={texts.files.defaultIndexName}
              description={texts.files.indexNameHint}
              key={form.key('indexName')}
              {...form.getInputProps('indexName')}
              mb="sm"
            />

            <TextInput
              id="endpoint"
              label={texts.common.endpoint}
              type="url"
              required
              key={form.key('endpoint')}
              {...form.getInputProps('endpoint')}
              onChange={(e) => handleEndpointChange(e.target.value)}
              mb="sm"
            />

            <Textarea
              id="headers"
              label={texts.common.headers}
              key={form.key('headers')}
              {...form.getInputProps('headers')}
              onChange={(e) => handleHeadersChange(e.target.value)}
              mb="sm"
            />

            {!target && (
              <Select
                id="type"
                data={bucketTypeOptions}
                label={texts.files.bucketType}
                required
                key={form.key('type')}
                {...form.getInputProps('type')}
                mb="sm"
              />
            )}

            {watchIsUser && (
              <NumberInput
                id="perUserQuota"
                label={texts.files.perUserQuota}
                key={form.key('perUserQuota')}
                {...form.getInputProps('perUserQuota')}
                mb="sm"
              />
            )}

            <MultiSelect
              id="allowedFileNameExtensions"
              data={fileTypes?.items ?? []}
              disabled={!fileTypes?.items?.length}
              label={texts.files.allowedFileTypes}
              required
              key={form.key('allowedFileNameExtensions')}
              {...form.getInputProps('allowedFileNameExtensions')}
              mb="sm"
            />

            <FileSizeDynamicFields form={form} name="fileSizeLimits" label={texts.files.fileSizeLimits} suffix="MB" />
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}

interface FileSizeDynamicFieldsProps {
  form: UseFormReturnType<UpsertBucketDto>;
  name: string;
  label: string;
  suffix?: string;
  className?: string;
}

export function FileSizeDynamicFields({ form, name: _name, label, suffix, className }: FileSizeDynamicFieldsProps) {
  type DynamicFieldValue = { key: string; value: number }[];
  type FileSizeLimitsValue = { [key: string]: number };

  const transformToDynamicField = (fileSizeLimits: FileSizeLimitsValue): { fields: DynamicFieldValue; general: number } => {
    const fields: DynamicFieldValue = Object.entries(fileSizeLimits)
      .filter(([key]) => key !== 'general')
      .map(([key, value]) => ({ key, value }));
    return { fields, general: fileSizeLimits.general ?? 1 };
  };

  const transformToFileSizeLimits = (dynamicField: DynamicFieldValue, general: number): FileSizeLimitsValue => {
    const fileSizeLimits = dynamicField.reduce((acc, field) => {
      if (field.key) {
        acc[field.key.toLowerCase()] = field.value;
      }
      return acc;
    }, {} as FileSizeLimitsValue);
    fileSizeLimits.general = general;
    return fileSizeLimits;
  };

  // populate the dynamic fields with the prefilled values
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldValue>(
    () => transformToDynamicField(form.getValues().fileSizeLimits ?? {}).fields,
  );
  const [generalValue, setGeneralValue] = useState<number>(
    () => transformToDynamicField(form.getValues().fileSizeLimits ?? {}).general,
  );

  const updateFormValue = (fields: DynamicFieldValue, general: number) => {
    const fileSizeLimits = transformToFileSizeLimits(fields, general);
    form.setFieldValue('fileSizeLimits', fileSizeLimits as BucketDtoFileSizeLimits);
  };

  const handleAddField = () => {
    const newFields = [...dynamicFields, { key: '', value: 10 }];
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleRemoveField = (index: number) => {
    const newFields = dynamicFields.filter((_, i) => i !== index);
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleFieldKeyChange = (index: number, key: string) => {
    const newFields = [...dynamicFields];
    newFields[index] = { ...newFields[index], key };
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleFieldValueChange = (index: number, value: number) => {
    const newFields = [...dynamicFields];
    newFields[index] = { ...newFields[index], value };
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleGeneralChange = (value: number) => {
    setGeneralValue(value);
    updateFormValue(dynamicFields, value);
  };

  return (
    <div className={className}>
      <label className={classes.label}>{label}</label>
      <div className={classes.rows}>
        <div className={clsx(classes.row, className)}>
          <button type="button" className={classes.iconButton} data-testid="fileSizeLimitsDynamic.add" onClick={handleAddField}>
            <Icon icon="plus" />
          </button>
          <input
            placeholder="general"
            disabled
            className={clsx(classes.input, className)}
            aria-label={texts.accessibility.fileTypeGeneral}
          />
          <div className={classes.suffixWrapper}>
            <input
              type="number"
              placeholder="10"
              step="0.1"
              value={generalValue}
              onChange={(e) => handleGeneralChange(parseFloat(e.target.value) || 0)}
              className={clsx(classes.input, classes.inputWithSuffix, className)}
              data-testid="fileSizeLimitsGeneral.value"
              aria-label={texts.accessibility.generalFileSizeLimit}
            />
            {suffix && <span className={classes.suffix}>{suffix}</span>}
          </div>
        </div>
        {dynamicFields.map((field, index) => (
          <div key={index} className={clsx(classes.row, className)} data-testid={`fileSizeLimitsDynamic.${index}.row`}>
            <button
              type="button"
              className={classes.iconButton}
              data-testid={`fileSizeLimitsDynamic.${index}.remove`}
              onClick={() => handleRemoveField(index)}
            >
              <Icon icon="trash" />
            </button>
            <input
              placeholder="pdf"
              value={field.key}
              onChange={(e) => handleFieldKeyChange(index, e.target.value)}
              className={clsx(classes.input, className)}
              data-testid={`fileSizeLimitsDynamic.${index}.key`}
              aria-label={texts.accessibility.fileType(index + 1)}
            />
            <div className={classes.suffixWrapper}>
              <input
                type="number"
                placeholder="10"
                step="0.1"
                required
                value={field.value}
                onChange={(e) => handleFieldValueChange(index, parseFloat(e.target.value) || 0)}
                className={clsx(classes.input, classes.inputWithSuffix, className)}
                data-testid={`fileSizeLimitsDynamic.${index}.value`}
                aria-label={texts.accessibility.fileSizeLimit(index + 1)}
              />
              {suffix && <span className={classes.suffix}>{suffix}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
