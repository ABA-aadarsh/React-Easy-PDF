import { useRef, useCallback } from 'react'

export function useThrottle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): T {
  const lastRun = useRef(0)

  return useCallback((...args: Parameters<T>) => {
    console.log("Throttle is being called")
    const now = Date.now()
    if (now - lastRun.current >= limit) {
      lastRun.current = now
      fn(...args)
    }else{
      console.log("This time scroll was not handled")
    }
  }, [fn, limit]) as T
}
