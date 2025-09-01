import * as Y from 'yjs'

import './App.css'
import { invariant } from 'es-toolkit'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { DebugPanel } from './components/debug-panel'

export default function App() {
  const { state } = useEditorState()

  useEffect(() => {
    setTimeout(() => {
      if (state.has(RootNode.rootKey)) return

      state.update((t) => {
        new RootNode({ lifecycle: 'detached', state: t }).create({
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

type NodeLifecycle = NodeFields['lifecycle']
type NodeFields =
  | DetachedFields
  | ReadonlyFields<EditorNode>
  | WritableFields<EditorNode>

interface DetachedFields {
  readonly lifecycle: 'detached'
  readonly state: WriteableState
}

interface ReadonlyFields<N extends EditorNode> {
  readonly lifecycle: 'readonly'
  readonly key: Key<N>
  readonly state: ReadonlyState
}

interface WritableFields<N extends EditorNode> {
  readonly lifecycle: 'writable'
  readonly key: Key<N>
  readonly state: WriteableState
}

function isStored<N extends AbstractEditorNode>(
  node: N,
): node is N & AbstractEditorNode<'readonly' | 'writable'> {
  return node.lifecycle !== 'detached'
}

abstract class AbstractEditorNode<
  L extends NodeLifecycle = NodeLifecycle,
  Description extends EditorNode = EditorNode,
> implements EditorNode
{
  constructor(protected readonly fields: NodeFields & { lifecycle: L }) {}

  static get type(): string {
    throw new Error('Node type not implemented')
  }

  get jsonValue(): Description['jsonValue'] {
    throw new Error('not implemented yet')
  }

  get type(): Description['type'] {
    return Object.getPrototypeOf(this).constructor.type
  }

  get parentKey(): Description['parentKey'] {
    invariant(isStored(this), 'Node is not attached to state')
    return this.getParentKey()
  }

  get lifecycle() {
    return this.fields.lifecycle
  }

  get value(): Description['value'] {
    invariant(isStored(this), 'Node is not attached to state')
    return this.getEntry().value
  }

  getEntry(
    this: AbstractEditorNode<'readonly' | 'writable', Description>,
  ): Entry<this> {
    return this.fields.state.get(this.fields.key)
  }

  getParentKey(
    this: AbstractEditorNode<'readonly' | 'writable', Description>,
  ): ParentKey<this> {
    return this.getEntry().parentKey
  }

  getValue(
    this: AbstractEditorNode<'readonly' | 'writable', Description>,
  ): EntryValue<this> {
    return this.getEntry().value
  }

  abstract create(
    this: AbstractEditorNode<'detached', Description>,
    jsonValue: Description['jsonValue'],
    parentKey: ParentKey<this>,
  ): Key<this>
}

class TextNode<
  L extends NodeLifecycle = NodeLifecycle,
> extends AbstractEditorNode<
  L,
  {
    type: 'text'
    value: Y.Text
    parentKey: Key
    jsonValue: string
  }
> {
  static get type() {
    return 'text' as const
  }

  create(
    this: TextNode<'detached'>,
    jsonValue: string,
    parentKey: Key,
  ): Key<TextNode> {
    const value = new Y.Text()
    value.insert(0, jsonValue)

    return this.fields.state.insert<TextNode>({
      type: TextNode.type,
      parentKey,
      createValue: () => value,
    })
  }
}

class RootNode<
  L extends NodeLifecycle = NodeLifecycle,
> extends AbstractEditorNode<
  L,
  {
    type: 'root'
    value: Key<TextNode<'readonly' | 'writable'>>
    parentKey: null
    jsonValue: { type: 'root'; text: string }
  }
> {
  static rootKey: Key<RootNode> = 'root:0'

  static get type() {
    return 'root' as const
  }

  create(
    this: RootNode<'detached'>,
    jsonValue: { type: 'root'; text: string },
  ) {
    const value = new TextNode({
      lifecycle: 'detached',
      state: this.fields.state,
    }).create(jsonValue.text, RootNode.rootKey)

    return this.fields.state.insertRoot({ key: RootNode.rootKey, value })
  }
}

let ydoc: Y.Doc | null = null

function getSingletonYDoc() {
  if (!ydoc) {
    ydoc = new Y.Doc()
  }
  return ydoc
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

class EditorState implements ReadonlyState {
  private ydoc = getSingletonYDoc()
  private state = this.ydoc.getMap('state')
  private entries: Y.Map<Entry> = this.ydoc.getMap('entries')
  private lastKey = -1

  get<N extends EditorNode>(key: Key<N>): Entry<N> {
    const entry = this.entries.get(key)

    invariant(entry != null, `Node with key ${key} does not exist`)

    return entry
  }

  getEntries(): [string, Entry][] {
    return Array.from(this.entries.entries())
  }

  has<N extends EditorNode>(key: Key<N>): boolean {
    return this.entries.has(key)
  }

  addUpdateListener(listener: () => void) {
    this.ydoc.on('update', listener)
  }

  removeUpdateListener(listener: () => void) {
    this.ydoc.off('update', listener)
  }

  update(updateFn: (t: Transaction) => void) {
    this.ydoc.transact(() => {
      updateFn(
        new Transaction(
          (key) => this.get(key),
          (key, entry) => this.set(key, entry),
          (type) => this.generateKey(type),
        ),
      )
      this.incrementUpdateCount()
    })
  }

  get updateCount(): number {
    const updateCount = this.state.get('updateCount') ?? 0

    invariant(typeof updateCount === 'number', 'updateCounter must be a number')

    return updateCount
  }

  private incrementUpdateCount() {
    this.state.set('updateCount', this.updateCount + 1)
  }

  private set<N extends EditorNode>(key: Key<N>, entry: Entry<N>) {
    this.entries.set(key, entry)
  }

  private generateKey<N extends EditorNode>(type: Type<N>): Key<N> {
    this.lastKey += 1

    return `${type}:${this.lastKey}`
  }
}

class Transaction implements WriteableState {
  constructor(
    public readonly get: <N extends EditorNode>(key: Key<N>) => Entry<N>,
    private readonly set: <N extends EditorNode>(
      key: Key<N>,
      entry: Entry<N>,
    ) => void,
    private readonly generateKey: <N extends EditorNode>(
      type: Type<N>,
    ) => Key<N>,
  ) {}

  update<N extends EditorNode>(
    key: Key<N>,
    updateFn: EntryValue<N> | ((v: EntryValue<N>) => EntryValue<N>),
  ) {
    const { type, parentKey, value } = this.get(key)
    const newValue = typeof updateFn === 'function' ? updateFn(value) : updateFn

    this.set(key, { type, key, parentKey, value: newValue })
  }

  insertRoot({
    key,
    value,
  }: {
    key: Key<RootNode>
    value: EntryValue<RootNode>
  }): Key<RootNode> {
    this.set(key, { type: RootNode.type, key, parentKey: null, value })
    return key
  }

  insert<N extends EditorNode>({
    type,
    parentKey,
    createValue,
  }: {
    type: Type<N>
    parentKey: ParentKey<N>
    createValue: (key: Key<N>) => EntryValue<N>
  }): Key<N> {
    const key = this.generateKey(type)
    const value = createValue(key)

    this.set(key, { type, key, parentKey, value })

    return key
  }
}

interface ReadonlyState {
  get<N extends EditorNode>(key: Key<N>): Entry<N>
}

interface WriteableState extends ReadonlyState {
  update<N extends EditorNode>(
    key: Key<N>,
    updateFn: EntryValue<N> | ((v: EntryValue<N>) => EntryValue<N>),
  ): void
  insertRoot(params: {
    key: Key<RootNode>
    value: EntryValue<RootNode>
  }): Key<RootNode>
  insert<N extends EditorNode>(params: {
    type: Type<N>
    parentKey: ParentKey<N>
    createValue: (key: Key<N>) => EntryValue<N>
  }): Key<N>
}

type Entry<N extends EditorNode = EditorNode> = {
  type: Type<N>
  key: Key<N>
  parentKey: ParentKey<N>
  value: EntryValue<N>
}
type EntryValue<N extends EditorNode> = N['value']
type ParentKey<N extends EditorNode> = N['parentKey']
type Key<N extends EditorNode = EditorNode> = `${Type<N>}:${number}`
type Type<N extends EditorNode> = N['type']

interface EditorNode {
  type: string
  parentKey: string | null
  value: object | number | boolean | string
  jsonValue: unknown
}
