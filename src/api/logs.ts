import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

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

// Exports query logs as CSV using the same filters as queryLogs (pagination
// does not apply — the server exports the full filtered set).
export async function exportQueryLogs(
  params: Omit<QueryLogsParams, 'pageNumber' | 'entriesPerPage' | 'descendingOrder'>
): Promise<{ blob: Blob; filename: string }> {
  const queryParams: Record<string, string> = {};

  if (params.name !== undefined) queryParams.name = params.name;
  if (params.classPath !== undefined) queryParams.classPath = params.classPath;
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.clientIpAddress) queryParams.clientIpAddress = params.clientIpAddress;
  if (params.protocol) queryParams.protocol = params.protocol;
  if (params.responseType) queryParams.responseType = params.responseType;
  if (params.rcode) queryParams.rcode = params.rcode;
  if (params.qname) queryParams.qname = params.qname;
  if (params.qtype) queryParams.qtype = params.qtype;
  if (params.qclass) queryParams.qclass = params.qclass;

  const { blob, filename } = await apiClient.download('/logs/export', queryParams);
  return { blob, filename: filename ?? 'query-logs.csv' };
}
