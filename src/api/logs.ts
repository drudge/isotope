import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface LogFile {
  fileName: string;
  size: string;
}

export interface LogsListResponse {
  logFiles: LogFile[];
}

export interface QueryLogEntry {
  rowNumber: number;
  timestamp: string;
  clientIpAddress: string;
  protocol: string;
  responseType: string;
  responseRtt?: number;
  rcode: string;
  qname: string;
  qtype: string;
  qclass: string;
  answer: string;
}

export interface QueryLogsResponse {
  pageNumber: number;
  totalPages: number;
  totalEntries: number;
  entries: QueryLogEntry[];
}

export interface QueryLogsParams {
  name?: string;
  classPath?: string;
  pageNumber?: number;
  entriesPerPage?: number;
  descendingOrder?: boolean;
  start?: string;
  end?: string;
  clientIpAddress?: string;
  protocol?: string;
  responseType?: string;
  rcode?: string;
  qname?: string;
  qtype?: string;
  qclass?: string;
}

export async function listLogs(): Promise<ApiResponse<LogsListResponse>> {
  return apiClient.get<LogsListResponse>('/logs/list');
}

export async function deleteLog(fileName: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/logs/delete', { log: fileName });
}

export async function deleteAllLogs(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/logs/deleteAll');
}

export async function queryLogs(params: QueryLogsParams = {}): Promise<ApiResponse<QueryLogsResponse>> {
  const queryParams: Record<string, string> = {};

  // For general DNS server logs (not DNS apps), these can be empty
  if (params.name !== undefined) queryParams.name = params.name;
  if (params.classPath !== undefined) queryParams.classPath = params.classPath;
  if (params.pageNumber) queryParams.pageNumber = String(params.pageNumber);
  if (params.entriesPerPage) queryParams.entriesPerPage = String(params.entriesPerPage);
  if (params.descendingOrder !== undefined) queryParams.descendingOrder = String(params.descendingOrder);
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.clientIpAddress) queryParams.clientIpAddress = params.clientIpAddress;
  if (params.protocol) queryParams.protocol = params.protocol;
  if (params.responseType) queryParams.responseType = params.responseType;
  if (params.rcode) queryParams.rcode = params.rcode;
  if (params.qname) queryParams.qname = params.qname;
  if (params.qtype) queryParams.qtype = params.qtype;
  if (params.qclass) queryParams.qclass = params.qclass;

  return apiClient.get<QueryLogsResponse>('/logs/query', queryParams);
}

export function downloadLogUrl(fileName: string): string {
  const token = sessionStorage.getItem('technitium_token');
  return `/api/logs/download?token=${token}&fileName=${encodeURIComponent(fileName)}`;
}

export async function downloadLog(fileName: string): Promise<string> {
  const token = sessionStorage.getItem('technitium_token');
  if (!token) throw new Error('Not authenticated');

  const url = `/api/logs/download?token=${token}&fileName=${encodeURIComponent(fileName)}`;

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    // Try to parse as JSON error
    try {
      const error = JSON.parse(text);
      throw new Error(error.errorMessage || `HTTP ${response.status}: ${response.statusText}`);
    } catch {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  return text;
}
