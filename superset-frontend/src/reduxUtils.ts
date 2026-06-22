/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { nanoid } from 'nanoid';
import { compose } from 'redux';
import persistState, { StorageAdapter } from 'redux-localstorage';
import { isEqual, omitBy, omit, isEqualWith } from 'lodash';
import { ensureIsArray } from '@superset-ui/core';

export function addToObject<
  S extends Record<string, unknown>,
  T extends Record<string, unknown> & { id?: string },
>(state: S, arrKey: string, obj: T): S {
  const newObject = { ...(state[arrKey] as Record<string, T>) };
  const copiedObject = { ...obj, id: obj.id || nanoid() };

  newObject[copiedObject.id] = copiedObject;
  return { ...state, [arrKey]: newObject } as S;
}

export function alterInObject<
  S extends Record<string, unknown>,
  T extends Record<string, unknown> & { id?: string },
>(state: S, arrKey: string, obj: T, alterations: Partial<T>): S {
  const newObject = { ...(state[arrKey] as Record<string, T>) };
  newObject[obj.id!] = { ...newObject[obj.id!], ...alterations } as T;
  return { ...state, [arrKey]: newObject } as S;
}

export function alterInArr<
  S extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(state: S, arrKey: string, obj: T, alterations: Partial<T>, idKey = 'id'): S {
  // Finds an item in an array in the state and replaces it with a
  // new object with an altered property
  const newArr: T[] = [];
  (state[arrKey] as T[]).forEach((arrItem: T) => {
    if (obj[idKey] === arrItem[idKey]) {
      newArr.push({ ...arrItem, ...alterations } as T);
    } else {
      newArr.push(arrItem);
    }
  });
  return { ...state, [arrKey]: newArr } as S;
}

export function removeFromArr<
  S extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(state: S, arrKey: string, obj: T, idKey = 'id'): S {
  const newArr: T[] = [];
  (state[arrKey] as T[]).forEach((arrItem: T) => {
    if (!(obj[idKey] === arrItem[idKey])) {
      newArr.push(arrItem);
    }
  });
  return { ...state, [arrKey]: newArr } as S;
}

export function getFromArr<T extends Record<string, unknown>>(
  arr: T[],
  id: string,
  idKey = 'id',
): T | undefined {
  let obj: T | undefined;
  arr.forEach(o => {
    if (o[idKey] === id) {
      obj = o;
    }
  });
  return obj;
}

export function addToArr<
  S extends Record<string, unknown>,
  T extends Record<string, unknown> & { id?: string },
>(state: S, arrKey: string, obj: T, prepend = false): S {
  const newObj = { ...obj, id: obj.id || nanoid() };
  const newState: Record<string, T[]> = {};
  if (prepend) {
    newState[arrKey] = [newObj, ...(state[arrKey] as T[])];
  } else {
    newState[arrKey] = [...(state[arrKey] as T[]), newObj];
  }
  return { ...state, ...newState } as S;
}

export function extendArr<
  S extends Record<string, unknown>,
  T extends Record<string, unknown> & { id?: string },
>(state: S, arrKey: string, arr: T[], prepend = false): S {
  const newArr: T[] = arr.map(el =>
    el.id ? el : ({ ...el, id: nanoid() } as T),
  );
  const newState: Record<string, T[]> = {};
  if (prepend) {
    newState[arrKey] = [...newArr, ...(state[arrKey] as T[])];
  } else {
    newState[arrKey] = [...(state[arrKey] as T[]), ...newArr];
  }
  return { ...state, ...newState } as S;
}

export function initEnhancer(
  persist = true,
  persistConfig: { paths?: StorageAdapter<unknown>; config?: string } = {},
  disableDebugger = false,
) {
  const { paths, config } = persistConfig;
  const composeEnhancers =
    process.env.WEBPACK_MODE === 'development' && disableDebugger !== true
      ? /* eslint-disable-next-line no-underscore-dangle, dot-notation */
        window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__' as keyof typeof window]
        ? /* eslint-disable-next-line no-underscore-dangle, dot-notation */
          window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__' as keyof typeof window](
            {
              trace: true,
            },
          )
        : compose
      : compose;

  return persist
    ? composeEnhancers(persistState(paths, config))
    : composeEnhancers();
}

export function areArraysShallowEqual(arr1: unknown[], arr2: unknown[]) {
  // returns whether 2 arrays are shallow equal
  // used in shouldComponentUpdate when denormalizing arrays
  // where the array object is different every time, but the content might
  // be the same
  if (!arr1 || !arr2) {
    return false;
  }
  if (arr1.length !== arr2.length) {
    return false;
  }
  const { length } = arr1;
  for (let i = 0; i < length; i += 1) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

export function areObjectsEqual(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  opts: {
    ignoreUndefined?: boolean;
    ignoreNull?: boolean;
    ignoreFields?: string[];
  } = { ignoreUndefined: false, ignoreNull: false, ignoreFields: [] },
) {
  let comp1 = obj1;
  let comp2 = obj2;
  if (opts.ignoreUndefined) {
    comp1 = omitBy(comp1, i => i === undefined);
    comp2 = omitBy(comp2, i => i === undefined);
  }
  if (opts.ignoreNull) {
    comp1 = omitBy(comp1, i => i === null);
    comp2 = omitBy(comp2, i => i === null);
  }
  if (opts.ignoreFields?.length) {
    const ignoreFields = ensureIsArray(opts.ignoreFields);
    return isEqualWith(comp1, comp2, (val1, val2) =>
      isEqual(
        ensureIsArray(val1).map(value => omit(value, ignoreFields)),
        ensureIsArray(val2).map(value => omit(value, ignoreFields)),
      ),
    );
  }
  return isEqual(comp1, comp2);
}
