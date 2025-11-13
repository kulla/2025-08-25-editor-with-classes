import type { Key } from '../state/types'
import {
  EditorNode,
  type EditorNodeConstructor,
  type Lifecycle,
} from './editor-node'
import type { JSONValue, NodeMap, NodeType } from './types'

declare module './types' {
  interface NodeMap {
    paragraph: {
      entryValue: Key<'text'>
      jsonValue: { type: 'paragraph'; value: JSONValue<'text'> }
      wrappedNodeChildType: 'text'
    }
  }
}

abstract class WrappedNode<
  L extends Lifecycle,
  T extends WrappedNodeTypes,
  C extends WrappedNodeMap[T],
> extends EditorNode<L, T> {
  abstract childClass: EditorNodeConstructor<L, C>

  create(
    this: WrappedNode<'detached', T, C>,
    { type, value }: { type: T; value: JSONValue<C> },
    parentKey: Key,
  ): Key<T> {
    return this.state.insert({
      type,
      parentKey,
      createValue: (key) => {
        const child = new this.childClass('detached', this.state, undefined)

        return child.create(value, key)
      },
    })
  }
}

type WrappedNodeMap = {
  [S in NodeType]: NodeMap[S] extends { wrappedNodeChildType: string }
    ? NodeMap[S]['wrappedNodeChildType']
    : never
}
type WrappedNodeTypes = keyof WrappedNodeMap

export class ParagraphNode<L extends Lifecycle = Lifecycle> extends WrappedNode<
  L,
  'paragraph',
  'text'
> {
  static get type() {
    return 'text' as const
  }
}
