import { useMutation } from '@tanstack/react-query';
import { AppClient, UserDto } from 'src/api';

export function useDeleteUser(
  api: AppClient,
  target: UserDto | null,
  onDelete: ((userId: string) => void) | null,
  onClose: () => void,
) {
  const { mutate, error, isPending } = useMutation({
    mutationFn: (userId: string) => {
      if (onDelete === null || target === null) {
        throw new Error('onDelete function or target not present, while running mutate inside useDeleteUser hook.');
      }
      return api.users.deleteUser({ id: userId });
    },
    onSuccess: () => {
      if (onDelete && target) onDelete(target.id);
      onClose();
    },
    onError: (err) => {
      console.error(err);
    },
  });
  return { mutate, error, isPending };
}
