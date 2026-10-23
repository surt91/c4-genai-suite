import { Button, Divider, Group, NumberInput, Portal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import { useApi, UserGroupDto } from 'src/api';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { useDeleteUserGroup } from 'src/pages/admin/user-groups/hooks/useDeleteUserGroup';
import { useUpdateUserGroup } from 'src/pages/admin/user-groups/hooks/useUpdateUserGroup';
import { texts } from 'src/texts';
import formClasses from '../forms.module.css';
import classes from './UserGroups.module.css';

const createScheme = () =>
  z.object({
    name: z.string().min(1, texts.common.name),
    monthlyTokens: z
      .number()
      .positive()
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    monthlyUserTokens: z
      .number()
      .positive()
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
  });

type SchemaType = z.infer<ReturnType<typeof createScheme>>;

export interface UpdateUserGroupDialogProps {
  target: UserGroupDto;
  onClose: () => void;
  onUpdate: (userGroup: UserGroupDto) => void;
  onDelete: (id: string) => void;
}

export function UpdateUserGroupDialog({ onClose, onDelete, onUpdate, target }: UpdateUserGroupDialogProps) {
  const api = useApi();

  const userGroupUpdate = useUpdateUserGroup(api, target, onUpdate, onClose);

  const userGroupDelete = useDeleteUserGroup(api, target, onDelete, onClose);

  const form = useForm<SchemaType>({
    validate: zod4Resolver(createScheme()),
    initialValues: target,
    mode: 'controlled',
  });
  return (
    <Portal>
      <form
        noValidate
        onSubmit={form.onSubmit((v) =>
          userGroupUpdate.mutate({
            name: v.name,
            monthlyTokens: v.monthlyTokens ? v.monthlyTokens : undefined,
            monthlyUserTokens: v.monthlyUserTokens ? v.monthlyUserTokens : undefined,
          }),
        )}
      >
        <Modal
          size="lg"
          onClose={onClose}
          header={<div className={classes.dialogHeader}>{texts.userGroups.update}</div>}
          footer={
            <fieldset disabled={userGroupUpdate.isPending || userGroupDelete.isPending || target.isBuiltIn}>
              <Group justify="flex-end" gap={16} wrap="nowrap" align="stretch">
                <Button variant="subtle" type="button" onClick={onClose}>
                  {texts.common.cancel}
                </Button>

                <Button type="submit">{texts.common.save}</Button>
              </Group>
            </fieldset>
          }
        >
          <fieldset disabled={userGroupUpdate.isPending || userGroupDelete.isPending || target.isBuiltIn}>
            <FormAlert common={texts.userGroups.updateFailed} error={userGroupUpdate.error} />

            <TextInput
              id="name"
              withAsterisk
              label={texts.common.groupName}
              mb="md"
              key={form.key('name')}
              {...form.getInputProps('name')}
            />

            <NumberInput
              id="monthlyTokens"
              label={texts.common.monthlyTokens}
              mb="md"
              key={form.key('monthlyTokens')}
              {...form.getInputProps('monthlyTokens')}
            />

            <NumberInput
              id="monthlyUserTokens"
              label={texts.common.monthlyUserTokens}
              mb="md"
              key={form.key('monthlyUserTokens')}
              {...form.getInputProps('monthlyUserTokens')}
            />

            <Divider my="xs" label={texts.common.dangerZone} labelPosition="left" />

            <div className={classes.dangerZone}>
              <label className={formClasses.labelInput}>{texts.common.remove}</label>
              <ConfirmDialog
                title={texts.userGroups.removeConfirmTitle}
                text={texts.userGroups.removeConfirmText}
                onPerform={userGroupDelete.mutate}
              >
                {({ onClick }) => (
                  <Button type="button" variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={onClick}>
                    {texts.common.remove}
                  </Button>
                )}
              </ConfirmDialog>
            </div>
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
