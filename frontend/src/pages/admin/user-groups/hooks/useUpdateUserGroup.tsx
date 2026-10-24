import { useMutation } from '@tanstack/react-query';
import { AppClient } from 'src/api';
import { UpsertUserGroupDto, UserGroupDto } from 'src/api/generated';

export function useUpdateUserGroup(
  api: AppClient,
  target: UserGroupDto,
  onUpdate: (userGroup: UserGroupDto) => void,
  onClose: () => void,
) {
  const { mutate, error, isPending } = useMutation({
    mutationFn: (request: UpsertUserGroupDto) => {
      return api.users.putUserGroup({ id: target.id, upsertUserGroupDto: request });
    },
    onSuccess: (response) => {
      onUpdate(response);
      onClose();
    },
  });
  return { mutate, error, isPending };
}
