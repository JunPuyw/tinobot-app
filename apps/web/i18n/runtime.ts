type LocaleChangeListener = () => void;

const listeners = new Set<LocaleChangeListener>();

export function translate(key: string): string {
  return key;
}

export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyLocaleChange(): void {
  listeners.forEach((listener) => listener());
}
