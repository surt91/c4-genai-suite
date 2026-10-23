import { useQuery } from '@tanstack/react-query';
import { ProfileContext } from 'src/hooks';
import { useApi } from '../api';
import { LoadError } from './LoadError';

export function RouteWhenPrivate(props: React.PropsWithChildren) {
  const { children } = props;

  const api = useApi();
  const {
    data: profile,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.auth.getProfile(),
    refetchOnWindowFocus: false,
  });

  if (!profile) {
    // a 401 leads to the login page (see the API middleware), other errors would leave a white page
    return isError ? <LoadError onRetry={() => void refetch()} /> : null;
  }

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}
