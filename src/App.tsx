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
    protected _state: EditorState,
    protected _id: NodeId,
  ) {
    invariant(isIdType(this.type, _id), `Id ${_id} is not of type ${this.type}`)
  }

  static get type(): string {
    throw new Error('Node type not implemented')
  }

  get id(): NodeId<this> {
    return this._id as NodeId<this>
  }

  get type(): T {
    return Object.getPrototypeOf(this).constructor.type
  }

  get entry(): Entry<this> {
    return this._state.get(this.id)
  }

  get parentId(): P {
    return this.entry.parentId
  }

  get value(): V {
    return this.entry.value
  }
}

class TextNode extends EditorNode<'text', Y.Text, NodeId> {
  static get type() {
    return 'text' as const
  }
}

class RootNode extends EditorNode<'root', NodeId<TextNode>, null> {
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

  get<N extends EditorNode>(id: NodeId<N>): Entry<N> {
    const entry = this.entries.get(id)

    invariant(entry != null, `Node with id ${id} does not exist`)

    return entry
  }
}

type Entry<N extends EditorNode = EditorNode> = {
  id: NodeId<N>
  parentId: ParentId<N>
  value: EntryValue<N>
}
type EntryValue<N extends EditorNode> = N['value']
type ParentId<N extends EditorNode> = N['parentId']
type NodeId<N extends EditorNode = EditorNode> = `${Type<N>}:${number}`
type Type<N extends EditorNode> = N['type']

function isIdType<N extends EditorNode>(
  type: Type<N>,
  id: NodeId,
): id is NodeId<N> {
  return id.startsWith(`${type}:`)
}
