import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface LogFile {
  fileName: string;
  size: string;
}

export interface LogsListResponse {
  logFiles: LogFile[];
}

export async function listLogs(): Promise<ApiResponse<LogsListResponse>> {
  return apiClient.get<LogsListResponse>('/logs/list');
}

export async function downloadLog(fileName: string): Promise<Blob> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/logs/download?token=${sessionStorage.getItem('technitium_token')}&fileName=${encodeURIComponent(fileName)}&limit=10000`);
  if (!response.ok) {
    throw new Error('Failed to download log');
  }
  return response.blob();
}

export async function deleteLog(fileName: string): Promise<ApiResponse<Record<string, never>>> {
  return apiClient.get<Record<string, never>>(`/logs/delete?fileName=${encodeURIComponent(fileName)}`);
}

export async function deleteAllLogs(): Promise<ApiResponse<Record<string, never>>> {
  return apiClient.get<Record<string, never>>('/logs/deleteAll');
}
