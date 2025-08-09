import { useRef, useCallback } from 'react'

export function useThrottle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): T {
  const lastRun = useRef(0)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRun.current >= limit) {
      lastRun.current = now
      fn(...args)
    }
  }, [fn, limit]) as T
}
