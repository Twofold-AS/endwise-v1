/**
 * Claude `parentF`: ytre skjema parkeres mens et nestet skjema er åpent.
 */

export type ParentForm<T> = T;

export function parkParent<T>(values: T): ParentForm<T> {
  return structuredClone(values);
}
