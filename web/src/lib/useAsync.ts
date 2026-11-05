import { useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/** Runs `load` whenever `deps` change and ignores results that arrive late. */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    let current = true;
    setState({ data: null, error: null, loading: true });
    load().then(
      (data) => {
        if (current) setState({ data, error: null, loading: false });
      },
      (err: unknown) => {
        if (current) setState({ data: null, error: err instanceof Error ? err : new Error(String(err)), loading: false });
      },
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
