// Generic functions for working with things

import { Id, generateId } from "id";

//Record from id-of-thing to thing
export type ThingMap<T> = Record<Id<T>, T>;
export function thingIds<T>(map: ThingMap<T>): Array<Id<T>> {
  return Object.keys(map) as Array<Id<T>>;
}

export function things<T>(map: ThingMap<T>): Array<T> {
  return Object.values(map);
}

interface HasParent<Parent> {
  parent: Id<Parent> | null;
}

// Build a map of parent to children for a given thingmap
export function buildThingChildrenMap<T extends HasParent<T>>(
  map: ThingMap<T>,
): Map<Id<T>, Array<T>> {
  const childrenMap = new Map();
  for (const thing of things(map)) {
    if (thing.parent) {
      if (!childrenMap.has(thing.parent)) {
        childrenMap.set(thing.parent, []);
      }
      childrenMap.get(thing.parent)!.push(thing);
    }
  }
  return childrenMap;
}
