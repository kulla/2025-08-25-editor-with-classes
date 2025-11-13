import type { EntryValue, NodeType } from '../nodes/types'

export interface ReadonlyState {
  get<T extends NodeType>(key: Key<T>): Entry<T>
}

export interface WriteableState extends ReadonlyState {
  update<T extends NodeType>(
    key: Key<T>,
    updateFn: EntryValue<T> | ((v: EntryValue<T>) => EntryValue<T>),
  ): void
  insertRoot(params: {
    key: Key<'root'>
    value: EntryValue<'root'>
  }): Key<'root'>
  insert<T extends NodeType>(params: {
    type: T
    parentKey: Key
    createValue: (key: Key<T>) => EntryValue<T>
  }): Key<T>
}

export type Entry<T extends NodeType = NodeType> = EntryOf<T>
type EntryOf<T extends NodeType = NodeType> = {
  readonly type: T
  readonly key: Key<T>
  readonly parentKey: Key | null
  readonly value: EntryValue<T>
}

export type Key<T extends NodeType = NodeType> = `${T}:${number}`
