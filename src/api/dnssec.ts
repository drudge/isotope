import { apiClient } from './client';
import type {
  ApiResponse,
  DnssecDsInfo,
  DnssecKeyType,
  DnssecPrivateKey,
  DnssecProperties,
} from '@/types/api';

// DNSSEC zone management (zones/dnssec/*). All endpoints operate on primary
// zones only; the server enforces Zone: Delete permission for mutations.

// Key generation choice shared by signZone and addPrivateKey. The server
// takes algorithm=RSA|ECDSA|EDDSA plus hashAlgorithm/keySize for RSA or
// curve for ECDSA/EDDSA.
export interface DnssecKeyAlgorithm {
  algorithm: 'RSA' | 'ECDSA' | 'EDDSA';
  // RSA only. Valid values: MD5, SHA1, SHA256, SHA512.
  hashAlgorithm?: string;
  // ECDSA: P256 | P384. EDDSA: ED25519 | ED448.
  curve?: string;
}

function keyAlgorithmParams(key: DnssecKeyAlgorithm): Record<string, string> {
  const params: Record<string, string> = { algorithm: key.algorithm };
  if (key.algorithm === 'RSA') {
    if (key.hashAlgorithm) params.hashAlgorithm = key.hashAlgorithm;
  } else if (key.curve) {
    params.curve = key.curve;
  }
  return params;
}

export interface SignZoneOptions extends DnssecKeyAlgorithm {
  // RSA only; required by the server when generating RSA keys.
  kskKeySize?: number;
  zskKeySize?: number;
  // Server default is 3600 (the API docs claim 86400; the code disagrees).
  dnsKeyTtl?: number;
  // 0 disables automatic ZSK rollover. Server default is 30.
  zskRolloverDays?: number;
  nxProof?: 'NSEC' | 'NSEC3';
  // NSEC3 only.
  iterations?: number;
  saltLength?: number;
}

export async function signZone(
  zone: string,
  options: SignZoneOptions
): Promise<ApiResponse<void>> {
  const params: Record<string, string> = {
    zone,
    ...keyAlgorithmParams(options),
  };
  if (options.algorithm === 'RSA') {
    if (options.kskKeySize !== undefined) params.kskKeySize = String(options.kskKeySize);
    if (options.zskKeySize !== undefined) params.zskKeySize = String(options.zskKeySize);
  }
  if (options.dnsKeyTtl !== undefined) params.dnsKeyTtl = String(options.dnsKeyTtl);
  if (options.zskRolloverDays !== undefined) params.zskRolloverDays = String(options.zskRolloverDays);
  if (options.nxProof) {
    params.nxProof = options.nxProof;
    if (options.nxProof === 'NSEC3') {
      if (options.iterations !== undefined) params.iterations = String(options.iterations);
      if (options.saltLength !== undefined) params.saltLength = String(options.saltLength);
    }
  }
  return apiClient.get<void>('/zones/dnssec/sign', params);
}

export async function unsignZone(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/unsign', { zone });
}

export async function getDsInfo(zone: string): Promise<ApiResponse<DnssecDsInfo>> {
  return apiClient.get<DnssecDsInfo>('/zones/dnssec/viewDS', { zone });
}

export async function getDnssecProperties(zone: string): Promise<ApiResponse<DnssecProperties>> {
  return apiClient.get<DnssecProperties>('/zones/dnssec/properties/get', { zone });
}

export async function convertToNsec(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/convertToNSEC', { zone });
}

export async function convertToNsec3(
  zone: string,
  iterations?: number,
  saltLength?: number
): Promise<ApiResponse<void>> {
  const params: Record<string, string> = { zone };
  if (iterations !== undefined) params.iterations = String(iterations);
  if (saltLength !== undefined) params.saltLength = String(saltLength);
  return apiClient.get<void>('/zones/dnssec/properties/convertToNSEC3', params);
}

export async function updateNsec3Params(
  zone: string,
  iterations: number,
  saltLength: number
): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/updateNSEC3Params', {
    zone,
    iterations: String(iterations),
    saltLength: String(saltLength),
  });
}

export async function updateDnsKeyTtl(zone: string, ttl: number): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/updateDnsKeyTtl', {
    zone,
    ttl: String(ttl),
  });
}

export interface AddPrivateKeyOptions extends DnssecKeyAlgorithm {
  keyType: DnssecKeyType;
  // RSA only; required by the server when generating RSA keys.
  keySize?: number;
  // Server defaults: 30 for ZSK, 0 (disabled) for KSK.
  rolloverDays?: number;
}

export async function addPrivateKey(
  zone: string,
  options: AddPrivateKeyOptions
): Promise<ApiResponse<{ addedDnssecPrivateKey: DnssecPrivateKey }>> {
  const params: Record<string, string> = {
    zone,
    keyType: options.keyType,
    ...keyAlgorithmParams(options),
  };
  if (options.algorithm === 'RSA' && options.keySize !== undefined) {
    params.keySize = String(options.keySize);
  }
  if (options.rolloverDays !== undefined) params.rolloverDays = String(options.rolloverDays);
  return apiClient.get<{ addedDnssecPrivateKey: DnssecPrivateKey }>(
    '/zones/dnssec/properties/addPrivateKey',
    params
  );
}

export async function updatePrivateKey(
  zone: string,
  keyTag: number,
  rolloverDays: number
): Promise<ApiResponse<{ updatedDnssecPrivateKey: DnssecPrivateKey }>> {
  return apiClient.get<{ updatedDnssecPrivateKey: DnssecPrivateKey }>(
    '/zones/dnssec/properties/updatePrivateKey',
    { zone, keyTag: String(keyTag), rolloverDays: String(rolloverDays) }
  );
}

// Only keys still in the Generated state can be deleted.
export async function deletePrivateKey(zone: string, keyTag: number): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/deletePrivateKey', {
    zone,
    keyTag: String(keyTag),
  });
}

export async function publishAllPrivateKeys(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/publishAllPrivateKeys', { zone });
}

// Promotes a Ready KSK to Active once its DS record is published at the
// parent zone. Present in the server's route table but absent from APIDOCS.
export async function activateKskDnsKey(zone: string, keyTag: number): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/activateKskDnsKey', {
    zone,
    keyTag: String(keyTag),
  });
}

export async function rolloverDnsKey(zone: string, keyTag: number): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/rolloverDnsKey', {
    zone,
    keyTag: String(keyTag),
  });
}

export async function retireDnsKey(zone: string, keyTag: number): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/dnssec/properties/retireDnsKey', {
    zone,
    keyTag: String(keyTag),
  });
}
