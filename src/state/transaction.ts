import { RootNode } from '../nodes/root'
import type { EntryValue, NodeType } from '../nodes/types'
import type { Entry, Key, WriteableState } from './types'

export class Transaction implements WriteableState {
  constructor(
    public readonly get: <T extends NodeType>(key: Key<T>) => Entry<T>,
    private readonly set: <T extends NodeType>(
      key: Key<T>,
      entry: Entry<T>,
    ) => void,
    private readonly generateKey: <T extends NodeType>(type: T) => Key<T>,
  ) {}

  update<T extends NodeType>(
    key: Key<T>,
    updateFn: EntryValue<T> | ((v: EntryValue<T>) => EntryValue<T>),
  ) {
    const { type, parentKey, value } = this.get(key)
    const newValue = typeof updateFn === 'function' ? updateFn(value) : updateFn

    this.set(key, { type, key, parentKey, value: newValue })
  }

  insertRoot({
    key,
    value,
  }: {
    key: Key<'root'>
    value: EntryValue<'root'>
  }): Key<'root'> {
    this.set(key, { type: RootNode.type, key, parentKey: null, value })
    return key
  }

  insert<T extends Exclude<NodeType, 'root'>>({
    type,
    parentKey,
    createValue,
  }: {
    type: T
    parentKey: T extends 'root' ? null : Key
    createValue: (key: Key<T>) => EntryValue<T>
  }): Key<T> {
    const key = this.generateKey(type)
    const value = createValue(key)

    this.set(key, { type, key, parentKey, value })

    return key
  }
}
