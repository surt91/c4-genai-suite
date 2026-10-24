import { Alert, Button, Divider, Group, Portal, Stack, Tabs } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBlocks, IconBrain, IconInfoCircle, IconRefresh, IconTool, IconTrash } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  BucketDto,
  CreateExtensionDto,
  ExtensionDto,
  ExtensionSpecDto,
  TestExtensionDto,
  UpdateExtensionDto,
  useApi,
} from 'src/api';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { DisabledAwareTooltip } from 'src/components/DisabledAwareTooltip';
import { texts } from 'src/texts';
import formClasses from '../forms.module.css';
import { ExtensionCard } from './ExtensionCard';
import { ExtensionForm } from './ExtensionForm';
import classes from './Extensions.module.css';
import { TestButton } from './TestButton';
import { useSpecResolver } from './hooks';

interface UpsertExtensionDialogProps {
  buckets: BucketDto[];
  specs: ExtensionSpecDto[];
  configurationId: number;
  onClose: () => void;
  onCreate: (extension: ExtensionDto) => void;
  onUpdate: (extension: ExtensionDto) => void;
  selected?: ExtensionDto;
  onDelete?: (id: number) => void;
}

export function UpsertExtensionDialog(props: UpsertExtensionDialogProps) {
  const { buckets, configurationId, onCreate, onUpdate, onDelete, onClose, specs, selected } = props;

  const api = useApi();

  const [spec, setSpec] = useState<ExtensionSpecDto | undefined>(selected?.spec);
  const [specChanged, setSpecChanged] = useState<boolean>(selected?.changed ?? false);

  const rebuild = useMutation({
    mutationFn: (values: TestExtensionDto) => {
      return api.extensions.rebuildExtension({ testExtensionDto: { ...values, id: selected?.id } });
    },
    onSuccess: (extension) => {
      setSpec(extension.spec);
      setSpecChanged(extension.changed);
      form.resetDirty();
    },
  });

  const updating = useMutation({
    mutationFn: (request: UpdateExtensionDto) => {
      return api.extensions.putExtension({ id: configurationId, extensionId: selected!.id, updateExtensionDto: { ...request } });
    },
    onSuccess: (response) => {
      onUpdate(response);
      setSpecChanged(false);
      onClose();
    },
  });

  const creating = useMutation({
    mutationFn: (request: CreateExtensionDto) => {
      return api.extensions.postExtension({ id: configurationId, createExtensionDto: { ...request, name: spec!.name } });
    },
    onSuccess: (response) => {
      onCreate(response);
      setSpecChanged(false);
      onClose();
    },
  });

  const deleting = useMutation({
    mutationFn: () => {
      return selected ? api.extensions.deleteExtension({ id: configurationId, extensionId: selected.id }) : Promise.resolve();
    },
    onSuccess: () => {
      setSpecChanged(false);
      if (selected) {
        onDelete?.(selected.id);
      }
      onClose();
    },
  });
  const resolver = useSpecResolver<CreateExtensionDto>(spec);

  const defaultValues: CreateExtensionDto = selected ?? { name: '', enabled: true, values: {} };
  const form = useForm<CreateExtensionDto>({
    validate: resolver,
    initialValues: defaultValues,
    mode: 'controlled',
  });

  const rebuildTriggered = useRef(false);
  useEffect(() => {
    if (selected && spec?.triggers && !rebuildTriggered.current) {
      rebuild.mutate(form.getValues());
      rebuildTriggered.current = true;
    }
  }, [spec, selected, rebuild, form]);
  // Recursively initialize a value for a given argument spec
  type SchemaArg = {
    default?: unknown;
    type?: string;
    properties?: Record<string, SchemaArg>;
  };

  function getInitialValue(arg: SchemaArg): unknown {
    if (typeof arg !== 'object' || arg === null) return undefined;
    if (Object.prototype.hasOwnProperty.call(arg, 'default') && arg.default !== undefined) {
      return arg.default;
    }
    if (arg.type === 'object' && arg.properties) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(arg.properties)) {
        obj[k] = getInitialValue(v);
      }
      return obj;
    }
    if (arg.type === 'array') {
      return [];
    }
    if (arg.type === 'boolean') {
      return undefined;
    }
    if (arg.type === 'number' || arg.type === 'integer') {
      return undefined;
    }
    if (arg.type === 'string') {
      return undefined;
    }
    return undefined;
  }

  useEffect(() => {
    if (spec) {
      // Build the complete values object with all fields from the spec
      const currentFormValues = form.getValues();
      const currentValues = currentFormValues.values ?? {};
      const newValues: Record<string, unknown> = { ...currentValues };

      // Initialize all argument fields from the spec
      if (spec.arguments) {
        Object.entries(spec.arguments).forEach(([key, arg]) => {
          if (newValues[key] === undefined) {
            newValues[key] = getInitialValue(arg);
          }
        });
      }

      // Set all values at once to ensure the form structure is correct
      form.setValues({
        ...currentFormValues,
        name: spec.name,
        values: newValues,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const asTools = specs.filter((x) => x.type === 'tool');
  const asOthers = specs.filter((x) => x.type === 'other');
  const asModels = specs.filter((x) => x.type === 'llm');

  const modified = spec?.triggers?.some((x) => form.isDirty(`values.${x}`));

  return (
    <Portal>
      <form noValidate onSubmit={form.onSubmit((v) => (selected ? updating.mutate(v) : creating.mutate(v)))}>
        <Modal
          onClose={onClose}
          header={
            <div className={classes.dialogHeader}>
              {spec?.logo && (
                <img
                  className={classes.dialogLogo}
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(spec.logo)}`}
                  alt=""
                  aria-hidden="true"
                />
              )}
              {selected && texts.extensions.updateExtension}
              {!selected && texts.extensions.createExtension}
            </div>
          }
          footer={
            spec ? (
              <fieldset disabled={creating.isPending || updating.isPending || rebuild.isPending}>
                <Group justify="space-between" wrap="nowrap" align="stretch">
                  <Group gap={16} wrap="nowrap" align="stretch">
                    {spec.testable ? <TestButton extensionId={selected?.id} form={form} /> : <div />}
                  </Group>
                  <Group gap={16} wrap="nowrap" align="stretch">
                    <Button type="button" variant="subtle" onClick={onClose}>
                      {texts.common.cancel}
                    </Button>
                    {modified && (
                      <DisabledAwareTooltip label={texts.extensions.testTooltip}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => form.onSubmit((v) => rebuild.mutate(v))()}
                          loading={rebuild.isPending}
                          disabled={rebuild.isPending}
                        >
                          <IconRefresh size={20} />
                          {texts.extensions.rebuildSchema}
                        </Button>
                      </DisabledAwareTooltip>
                    )}
                    {!modified && <Button type="submit">{texts.common.save}</Button>}
                  </Group>
                </Group>
              </fieldset>
            ) : undefined
          }
        >
          <fieldset disabled={updating.isPending || deleting.isPending || creating.isPending}>
            <FormAlert common={texts.extensions.createExtensionFailed} error={creating.error} />
            <FormAlert common={texts.extensions.updateExtensionFailed} error={updating.error} />
            <FormAlert common={texts.extensions.rebuildSchemaFailed} error={rebuild.error} />
            {specChanged && (
              <Alert variant="light" color="orange" icon={<IconInfoCircle />}>
                {texts.extensions.schemaChanged}
              </Alert>
            )}

            {spec ? (
              <>
                <ExtensionForm buckets={buckets} spec={spec} form={form} />

                {selected && <Divider my="xs" label={texts.common.dangerZone} labelPosition="left" />}

                {selected && (
                  <div className={formClasses.row}>
                    <label className={formClasses.labelInput}>{texts.common.remove}</label>
                    <div className={formClasses.control}>
                      <ConfirmDialog
                        title={texts.extensions.removeExtensionConfirmText}
                        text={texts.extensions.removeExtensionConfirmText}
                        onPerform={deleting.mutate}
                      >
                        {({ onClick }) => (
                          <Button
                            type="button"
                            variant="light"
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={onClick}
                          >
                            {texts.common.remove}
                          </Button>
                        )}
                      </ConfirmDialog>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Stack gap={24}>
                <Tabs
                  color={'blue'}
                  classNames={{ tabLabel: classes.tabLabel, panel: classes.dialogTabPanel }}
                  defaultValue={'models'}
                >
                  <Tabs.List grow>
                    <Tabs.Tab value="models" leftSection={<IconBrain size={18} />}>
                      {texts.extensions.typeModels}
                    </Tabs.Tab>
                    <Tabs.Tab value="tools" leftSection={<IconTool size={18} />}>
                      {texts.extensions.typeTools}
                    </Tabs.Tab>
                    <Tabs.Tab value="others" leftSection={<IconBlocks size={18} />}>
                      {texts.extensions.typeOther}
                    </Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="models">
                    <div className={classes.cards}>
                      {asModels.map((spec) => (
                        <ExtensionCard key={spec.name} buckets={buckets} spec={spec} onClick={setSpec} />
                      ))}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="tools">
                    <div className={classes.cards}>
                      {asTools.map((spec) => (
                        <ExtensionCard key={spec.name} buckets={buckets} spec={spec} onClick={setSpec} />
                      ))}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="others">
                    <div className={classes.cards}>
                      {asOthers.map((spec) => (
                        <ExtensionCard key={spec.name} buckets={buckets} spec={spec} onClick={setSpec} />
                      ))}
                    </div>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            )}
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
