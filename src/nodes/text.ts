import * as Y from 'yjs'

import type { Key } from '../state/types'
import { EditorNode, type Lifecycle } from './editor-node'

declare module './types' {
  interface NodeMap {
    text: {
      entryValue: Y.Text
      jsonValue: string
    }
  }
}

export class TextNode<L extends Lifecycle = Lifecycle> extends EditorNode<
  L,
  'text'
> {
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
