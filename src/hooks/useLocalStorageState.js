import { useState, useEffect } from 'react';

export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Não bloqueia a aplicação em caso de storage cheio
    }
  }, [key, value]);

  return [value, setValue];
}
