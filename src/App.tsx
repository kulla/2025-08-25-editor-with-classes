import * as Y from 'yjs'

import './App.css'
import { invariant } from 'es-toolkit'

export default function App() {
  return (
    <main className="prose p-10">
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
    </main>
  )
}

abstract class EditorNode<
  Description extends {
    readonly type: string
    readonly value: object | string | number | boolean
    readonly parentKey: string | null
  },
> {
  protected readonly state: EditorState
  protected readonly key: Key<this>

  constructor(state: EditorState, key: Key) {
    invariant(
      isKeyType(this.type as Type<this>, key),
      `Key ${key} is not of type ${this.type}`,
    )

    this.state = state
    this.key = key
  }

  static get type(): string {
    throw new Error('Node type not implemented')
  }

  get type(): Description['type'] {
    return Object.getPrototypeOf(this).constructor.type
  }

  get entry(): Entry<this> {
    return this.state.get(this.key)
  }

  get parentKey(): Description['parentKey'] {
    return this.entry.parentKey
  }

  get value(): Description['value'] {
    return this.entry.value
  }
}

class TextNode extends EditorNode<{
  type: 'text'
  value: Y.Text
  parentKey: Key
}> {
  static get type() {
    return 'text' as const
  }
}

class RootNode extends EditorNode<{
  type: 'root'
  value: Key<TextNode>
  parentKey: null
}> {
  static get type() {
    return 'root' as const
  }
}

const nodes = [RootNode, TextNode] as const

let ydoc: Y.Doc | null = null

function getSingletonYDoc() {
  if (!ydoc) {
    ydoc = new Y.Doc()
  }
  return ydoc
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

  update(updateFn: (t: Transaction) => void) {
    this.ydoc.transact(() => {
      updateFn(
        new Transaction(
          (key) => this.get(key),
          (key, entry) => this.set(key, entry),
          (type) => this.generateKey(type),
        ),
      )
      this.incrementUpdateCounter()
    })
  }

  get updateCounter(): number {
    const updateCounter = this.state.get('updateCounter') ?? 0

    invariant(
      typeof updateCounter === 'number',
      'updateCounter must be a number',
    )

    return updateCounter
  }

  private incrementUpdateCounter() {
    this.state.set('updateCounter', this.updateCounter + 1)
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
  }) {
    this.set(key, { type: RootNode.type, key, parentKey: null, value })
  }

  insert<N extends EditorNode>({
    type,
    parentKey,
    createValue,
  }: {
    type: Type<N>
    parentKey: ParentKey<N>
    createValue: (key: Key<N>) => EntryValue<N>
  }) {
    const key = this.generateKey(type)
    const value = createValue(key)

    this.set(key, { type, key, parentKey, value })
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
  insertRoot(params: { key: Key<RootNode>; value: EntryValue<RootNode> }): void
  insert<N extends EditorNode>(params: {
    type: Type<N>
    parentKey: ParentKey<N>
    createValue: (key: Key<N>) => EntryValue<N>
  }): void
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

function isKeyType<N extends EditorNode>(
  type: Type<N>,
  key: Key,
): key is Key<N> {
  return key.startsWith(`${type}:`)
}
