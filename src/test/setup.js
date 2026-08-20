import "@testing-library/jest-dom/vitest";

if (!window.localStorage) {
  const values = new Map();

  Object.defineProperty(
    window,
    "localStorage",
    {
      configurable: true,
      value: {
        get length() {
          return values.size;
        },
        clear() {
          values.clear();
        },
        getItem(key) {
          return values.has(key)
            ? values.get(key)
            : null;
        },
        key(index) {
          return (
            [...values.keys()][index] ??
            null
          );
        },
        removeItem(key) {
          values.delete(key);
        },
        setItem(key, value) {
          values.set(
            String(key),
            String(value)
          );
        },
      },
    }
  );
}
