import i18n from "./index";

/** Translate a key at call time using the active language. */
export const tr = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options) as string;
