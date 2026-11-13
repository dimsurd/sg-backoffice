"use client";

import { useEffect, useRef } from "react";

/**
 * Guards an action against double clicks/submits. `disabled={pending}` only
 * takes effect after React re-renders, so a fast second click can still fire;
 * this lock is set synchronously and released when `pending` goes back to false.
 */
export function useOnce<A extends unknown[]>(action: (...args: A) => void, pending: boolean) {
  const locked = useRef(false);
  useEffect(() => {
    if (!pending) locked.current = false;
  }, [pending]);
  return (...args: A) => {
    if (locked.current || pending) return;
    locked.current = true;
    action(...args);
  };
}
