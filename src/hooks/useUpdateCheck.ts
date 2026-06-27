import { useApi } from '@/hooks/useApi';
import { checkForUpdate } from '@/api/updates';
import type { UpdateCheckResult } from '@/types/api';

// Thin wrapper over useApi for the server update-check endpoint.
// Trusts the server's `updateAvailable` boolean rather than comparing version
// strings client-side. Re-runs on mount, so the badge self-clears once the
// server is actually upgraded. Call refresh() to re-check on demand.
export function useUpdateCheck() {
  const { data, error, isLoading, refetch } = useApi<UpdateCheckResult>(
    () => checkForUpdate(),
    [],
  );

  return {
    update: data,
    isUpdateAvailable: !!data?.updateAvailable,
    error,
    isLoading,
    refresh: refetch,
  };
}
