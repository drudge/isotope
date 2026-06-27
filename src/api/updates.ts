import { apiClient } from './client';
import type { ApiResponse, UpdateCheckResult } from '@/types/api';

// Asks the Technitium server whether a newer server version is available.
// The server performs (and caches) the upstream version check itself; we just
// surface its decision. PERMISSIONS: None — any authenticated user may call it.
export async function checkForUpdate(): Promise<ApiResponse<UpdateCheckResult>> {
  return apiClient.get<UpdateCheckResult>('/user/checkForUpdate');
}
