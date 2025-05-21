// Generic functions for working with things

import { Id } from "id";

//Record from id-of-thing to thing
export type ThingMap<T> = Record<Id<T>, T>;
export function thingIds<T>(map: ThingMap<T>): Array<Id<T>> {
  return Object.keys(map) as Array<Id<T>>;
}

export function things<T>(map: ThingMap<T>): Array<T> {
  return Object.values(map);
}

interface HasParent<Parent> {
  parentId: Id<Parent> | null;
  siblingIndex?: number;
}

// Build a map of parent to children for a given thingmap
export function buildThingChildrenMap<C extends HasParent<P>, P>(
  childThings: ThingMap<C>,
  sort: boolean = true
): Map<Id<P>, C[]> {
  const childrenMap = new Map<Id<P>, Array<C>>();
  for (const thing of things(childThings)) {
    if (thing.parentId) {
      if (!childrenMap.has(thing.parentId)) {
        childrenMap.set(thing.parentId, []);
      }
      childrenMap.get(thing.parentId)!.push(thing);
    }
  }

  if (sort) {
    // Sort children
    for (const parentId of childrenMap.keys()) {
      childrenMap.set(
        parentId,
        childrenMap
          .get(parentId)!
          .sort((a: C, b: C) => a.siblingIndex! - b.siblingIndex!)
      );
    }
  }

  return childrenMap;
}
