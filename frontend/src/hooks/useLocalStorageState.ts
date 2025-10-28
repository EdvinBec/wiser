import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook that syncs state with localStorage.
 * Supports migrations from legacy keys and custom serialization.
 *
 * @param key - Primary localStorage key to use
 * @param defaultValue - Default value or function that returns default value
 * @param options - Optional configuration
 * @returns Tuple of [value, setValue] similar to useState
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T | (() => T),
  options?: {
    legacyKeys?: string[]; // Try these keys if primary key doesn't exist
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const {
    legacyKeys = [],
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options ?? {};

  // Initialize state from localStorage or default
  const [state, setState] = useState<T>(() => {
    try {
      // Try primary key first
      let raw = localStorage.getItem(key);

      // Fall back to legacy keys
      if (!raw) {
        for (const legacyKey of legacyKeys) {
          raw = localStorage.getItem(legacyKey);
          if (raw) break;
        }
      }

      if (raw) {
        return deserialize(raw);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }

    // Return default value
    return typeof defaultValue === "function"
      ? (defaultValue as () => T)()
      : defaultValue;
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, state, serialize]);

  // Wrapped setState that matches React.useState signature
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  return [state, setValue];
}
