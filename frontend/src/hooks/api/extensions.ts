import { useQuery } from '@tanstack/react-query';
import { GetBucketAvailabilityData, useApi } from 'src/api';

/** The extensions of an assistant that store files in buckets of the given type (e.g. the files of a conversation). */
const useBucketAvailability = (configurationId: number | undefined, type: GetBucketAvailabilityData['path']['type']) => {
  const api = useApi();
  return useQuery({
    queryKey: ['extensions', 'bucket-availability', type, { configurationId }],
    queryFn: () => api.extensions.getBucketAvailability({ id: configurationId!, type }),
    // -1 is used while no assistant is selected (or loaded)
    enabled: configurationId != null && configurationId > 0,
  });
};

export const useConversationBucketAvailabilities = (configurationId: number | undefined) =>
  useBucketAvailability(configurationId, 'conversation');

/** The settings of the personal files of the user (user bucket) for the assistant, if it has them. */
export function useUserBucket(configurationId: number | undefined) {
  const { data } = useBucketAvailability(configurationId, 'user');
  return { userBucket: data?.extensions?.[0] };
}
