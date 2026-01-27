import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface DnsQueryParams {
  server: string;
  domain: string;
  type: string;
  protocol?: 'Udp' | 'Tcp' | 'Tls' | 'Https' | 'Quic';
  dnssec?: boolean;
  eDnsClientSubnet?: string;
  import?: boolean;
}

export interface DnsQueryResult {
  Metadata: {
    NameServer: string;
    Protocol: string;
    DatagramSize: string;
    RoundTripTime: string;
  };
  Identifier: number;
  IsResponse: boolean;
  OPCODE: string;
  AuthoritativeAnswer: boolean;
  Truncation: boolean;
  RecursionDesired: boolean;
  RecursionAvailable: boolean;
  Z: number;
  AuthenticData: boolean;
  CheckingDisabled: boolean;
  RCODE: string;
  QDCOUNT: number;
  ANCOUNT: number;
  NSCOUNT: number;
  ARCOUNT: number;
  Question: Array<{
    Name: string;
    Type: string;
    Class: string;
  }>;
  Answer?: Array<{
    Name: string;
    Type: string;
    Class: string;
    TTL: number;
    RDLENGTH: number;
    RDATA: Record<string, unknown>;
  }>;
  Authority?: Array<{
    Name: string;
    Type: string;
    Class: string;
    TTL: number;
    RDLENGTH: number;
    RDATA: Record<string, unknown>;
  }>;
  Additional?: Array<{
    Name: string;
    Type: string;
    Class: string;
    TTL: number;
    RDLENGTH: number;
    RDATA: Record<string, unknown>;
  }>;
}

export interface DnsQueryResponse {
  result: DnsQueryResult;
}

export async function resolveDns(params: DnsQueryParams): Promise<ApiResponse<DnsQueryResponse>> {
  const queryParams: Record<string, string> = {
    server: params.server,
    domain: params.domain,
    type: params.type,
  };

  if (params.protocol) queryParams.protocol = params.protocol;
  if (params.dnssec) queryParams.dnssec = 'true';
  if (params.eDnsClientSubnet) queryParams.eDnsClientSubnet = params.eDnsClientSubnet;
  if (params.import) queryParams.import = 'true';

  return apiClient.get<DnsQueryResponse>('/dnsClient/resolve', queryParams);
}
