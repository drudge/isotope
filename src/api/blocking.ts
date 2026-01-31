import { apiClient } from './client';
import type { ApiResponse, BlockingSettings, TemporaryDisableResponse } from '@/types/api';

interface SettingsResponse {
  enableBlocking: boolean;
  allowTxtBlockingReport: boolean;
  blockingBypassList: string[];
  blockingType: string;
  blockingAnswerTtl: number;
  customBlockingAddresses: string[];
  blockListUrls: string[];
  blockListUpdateIntervalHours: number;
  blockListNextUpdatedOn: string;
  temporaryDisableBlockingTill?: string;
}

export async function getBlockingSettings(): Promise<ApiResponse<BlockingSettings>> {
  const response = await apiClient.get<SettingsResponse>('/settings/get');

  if (response.status !== 'ok' || !response.response) {
    return response as ApiResponse<BlockingSettings>;
  }

  const settings = response.response;
  return {
    status: 'ok',
    response: {
      enableBlocking: settings.enableBlocking,
      allowTxtBlockingReport: settings.allowTxtBlockingReport,
      blockingBypassList: settings.blockingBypassList || [],
      blockingType: settings.blockingType as BlockingSettings['blockingType'],
      blockingAnswerTtl: settings.blockingAnswerTtl,
      customBlockingAddresses: settings.customBlockingAddresses || [],
      blockListUrls: settings.blockListUrls || [],
      blockListUpdateIntervalHours: settings.blockListUpdateIntervalHours,
      blockListNextUpdatedOn: settings.blockListNextUpdatedOn,
      temporaryDisableBlockingTill: settings.temporaryDisableBlockingTill,
    },
  };
}

export async function updateBlockingSettings(
  settings: Partial<{
    enableBlocking: boolean;
    allowTxtBlockingReport: boolean;
    blockingBypassList: string[];
    blockingType: string;
    blockingAnswerTtl: number;
    customBlockingAddresses: string[];
    blockListUrls: string[];
    blockListUpdateIntervalHours: number;
  }>
): Promise<ApiResponse<BlockingSettings>> {
  const params: Record<string, string> = {};

  if (settings.enableBlocking !== undefined) {
    params.enableBlocking = String(settings.enableBlocking);
  }
  if (settings.allowTxtBlockingReport !== undefined) {
    params.allowTxtBlockingReport = String(settings.allowTxtBlockingReport);
  }
  if (settings.blockingBypassList !== undefined) {
    params.blockingBypassList = settings.blockingBypassList.join(',');
  }
  if (settings.blockingType !== undefined) {
    params.blockingType = settings.blockingType;
  }
  if (settings.blockingAnswerTtl !== undefined) {
    params.blockingAnswerTtl = String(settings.blockingAnswerTtl);
  }
  if (settings.customBlockingAddresses !== undefined) {
    params.customBlockingAddresses = settings.customBlockingAddresses.join(',');
  }
  if (settings.blockListUrls !== undefined) {
    // Use 'false' to clear all URLs, otherwise join with comma
    params.blockListUrls = settings.blockListUrls.length === 0
      ? 'false'
      : settings.blockListUrls.join(',');
  }
  if (settings.blockListUpdateIntervalHours !== undefined) {
    params.blockListUpdateIntervalHours = String(settings.blockListUpdateIntervalHours);
  }

  const response = await apiClient.get<SettingsResponse>('/settings/set', params);

  if (response.status !== 'ok' || !response.response) {
    return response as ApiResponse<BlockingSettings>;
  }

  const updatedSettings = response.response;
  return {
    status: 'ok',
    response: {
      enableBlocking: updatedSettings.enableBlocking,
      allowTxtBlockingReport: updatedSettings.allowTxtBlockingReport,
      blockingBypassList: updatedSettings.blockingBypassList || [],
      blockingType: updatedSettings.blockingType as BlockingSettings['blockingType'],
      blockingAnswerTtl: updatedSettings.blockingAnswerTtl,
      customBlockingAddresses: updatedSettings.customBlockingAddresses || [],
      blockListUrls: updatedSettings.blockListUrls || [],
      blockListUpdateIntervalHours: updatedSettings.blockListUpdateIntervalHours,
      blockListNextUpdatedOn: updatedSettings.blockListNextUpdatedOn,
      temporaryDisableBlockingTill: updatedSettings.temporaryDisableBlockingTill,
    },
  };
}

export async function forceUpdateBlockLists(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/settings/forceUpdateBlockLists');
}

export async function temporaryDisableBlocking(
  minutes: number
): Promise<ApiResponse<TemporaryDisableResponse>> {
  return apiClient.get<TemporaryDisableResponse>('/settings/temporaryDisableBlocking', {
    minutes: String(minutes),
  });
}
