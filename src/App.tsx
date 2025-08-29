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
  T extends string = string,
  V = unknown,
  P extends string | null = string | null,
> {
  constructor(
    protected state: EditorState,
    protected _key: Key,
  ) {
    invariant(
      isKeyType(this.type, _key),
      `Key ${_key} is not of type ${this.type}`,
    )
  }

  static get type(): string {
    throw new Error('Node type not implemented')
  }

  get key(): Key<this> {
    return this._key as Key<this>
  }

  get type(): T {
    return Object.getPrototypeOf(this).constructor.type
  }

  get entry(): Entry<this> {
    return this.state.get(this.key)
  }

  get parentKey(): P {
    return this.entry.parentId
  }

  get value(): V {
    return this.entry.value
  }
}

class TextNode extends EditorNode<'text', Y.Text, Key> {
  static get type() {
    return 'text' as const
  }
}

class RootNode extends EditorNode<'root', Key<TextNode>, null> {
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

class EditorState {
  private ydoc = getSingletonYDoc()
  private entries: Y.Map<Entry> = this.ydoc.getMap('entries')

  get<N extends EditorNode>(key: Key<N>): Entry<N> {
    const entry = this.entries.get(key)

    invariant(entry != null, `Node with key ${key} does not exist`)

    return entry
  }
}

type Entry<N extends EditorNode = EditorNode> = {
  id: Key<N>
  parentId: ParentKey<N>
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
