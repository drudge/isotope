import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from '@/types/api';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = []
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetcher();

      if (response.status === 'ok') {
        // Technitium API wraps data in 'response' property, or at root for some endpoints
        const data = response.response ?? response;
        // Remove status/errorMessage from data if present at root
        const { status: _, errorMessage: __, response: ___, ...rest } = data as Record<string, unknown>;
        const finalData = Object.keys(rest).length > 0 ? rest : data;
        setState({ data: finalData as T, error: null, isLoading: false });
      } else {
        setState({ data: null, error: response.errorMessage || 'Unknown error', isLoading: false });
      }
    } catch (err) {
      setState({
        data: null,
        error: err instanceof Error ? err.message : 'Network error',
        isLoading: false,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
