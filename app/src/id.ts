export type Id<T> = string & { __brand: T };

export function generateId<T>(): Id<T> {
  return `${Math.random().toString(36).substring(2, 15)}${Math.random()
    .toString(36)
    .substring(2, 15)}` as Id<T>;
}
