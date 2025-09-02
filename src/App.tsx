import * as Y from 'yjs'

import './App.css'
import { invariant } from 'es-toolkit'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { DebugPanel } from './components/debug-panel'
import type { EntryValue, JSONValue, NodeType } from './nodes/types'
import { EditorState } from './state/editor-state'
import type { Entry, Key, ReadonlyState, WriteableState } from './state/types'

export default function App() {
  const { state } = useEditorState()

  useEffect(() => {
    setTimeout(() => {
      if (state.has(RootNode.rootKey)) return

      state.update((t) => {
        new RootNode('detached', t, undefined).create({
          type: 'root',
          text: 'Hello, Rsbuild!',
        })
      })
    }, 1000)
  })

  return (
    <main className="prose p-10">
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
      <h1>Debug Panel</h1>
      <DebugPanel
        labels={{ entries: 'Internal State' } as const}
        showOnStartup={{ entries: true }}
        getCurrentValue={{
          entries: () =>
            state
              .getEntries()
              .map(([key, entry]) => `${key}: ${JSON.stringify(entry)}`)
              .join('\n'),
        }}
      />
    </main>
  )
}

type Lifecycle = 'detached' | 'readonly' | 'writable'

abstract class EditorNode<
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

declare module './nodes/types' {
  interface NodeMap {
    text: {
      entryValue: Y.Text
      jsonValue: string
    }
  }
}

class TextNode<L extends Lifecycle = Lifecycle> extends EditorNode<L, 'text'> {
  static get type() {
    return 'text' as const
  }

  create(
    this: TextNode<'detached'>,
    jsonValue: string,
    parentKey: Key,
  ): Key<'text'> {
    const value = new Y.Text()
    value.insert(0, jsonValue)

    return this.state.insert({
      type: TextNode.type,
      parentKey,
      createValue: () => value,
    })
  }
}

declare module './nodes/types' {
  interface NodeMap {
    root: {
      entryValue: Key<'text'>
      jsonValue: { type: 'root'; text: string }
    }
  }
}

class RootNode<L extends Lifecycle = Lifecycle> extends EditorNode<L, 'root'> {
  static rootKey: Key<'root'> = 'root:0'

  static get type() {
    return 'root' as const
  }

  create(
    this: RootNode<'detached'>,
    jsonValue: { type: 'root'; text: string },
  ) {
    const value = new TextNode('detached', this.state, undefined).create(
      jsonValue.text,
      RootNode.rootKey,
    )

    return this.state.insertRoot({ key: RootNode.rootKey, value })
  }
}

function useEditorState() {
  const state = useRef(new EditorState()).current
  const lastReturn = useRef({ state, updateCount: state.updateCount })

  return useSyncExternalStore(
    (listener) => {
      state.addUpdateListener(listener)

      return () => state.removeUpdateListener(listener)
    },
    () => {
      if (lastReturn.current.updateCount === state.updateCount) {
        return lastReturn.current
      }

      lastReturn.current = { state, updateCount: state.updateCount }

      return lastReturn.current
    },
  )
}

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
