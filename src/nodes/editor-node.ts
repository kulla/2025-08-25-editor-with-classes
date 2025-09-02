import { invariant } from 'es-toolkit'
import type { Entry, Key, ReadonlyState, WriteableState } from '../state/types'
import type { EntryValue, JSONValue, NodeType } from './types'

export type Lifecycle = 'detached' | 'readonly' | 'writable'

export abstract class EditorNode<
  L extends Lifecycle = Lifecycle,
  T extends NodeType = NodeType,
> {
  constructor(
    public readonly lifecycle: L,
    protected readonly state: L extends 'readonly'
      ? ReadonlyState
      : WriteableState,
    public readonly key: L extends 'detached' ? undefined : Key<T>,
  ) {}

  static get type(): string {
    throw new Error('Node type not implemented')
  }

  get jsonValue(): JSONValue<T> {
    throw new Error('not implemented yet')
  }

  get type(): T {
    return Object.getPrototypeOf(this).constructor.type
  }

  get parentKey(): T extends 'root' ? null : Key {
    invariant(this.isStored(), 'Node is not attached to state')
    return this.getParentKey()
  }

  get entryValue(): EntryValue<T> {
    invariant(this.isStored(), 'Node is not attached to state')
    return this.getEntry().value
  }

  getEntry(this: EditorNode<'readonly' | 'writable', T>): Entry<T> {
    return this.state.get(this.key)
  }

  getParentKey(
    this: EditorNode<'readonly' | 'writable', T>,
  ): T extends 'root' ? null : Key {
    return this.getEntry().parentKey
  }

  getEntryValue(this: EditorNode<'readonly' | 'writable', T>): EntryValue<T> {
    return this.getEntry().value
  }

  abstract create(
    this: EditorNode<'detached', T>,
    jsonValue: JSONValue<T>,
    parentKey: T extends 'root' ? null : Key,
  ): Key<T>

  isStored(): this is EditorNode<'readonly' | 'writable', T> {
    return this.lifecycle !== 'detached'
  }
}
