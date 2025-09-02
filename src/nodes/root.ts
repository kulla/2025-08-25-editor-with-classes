import type { Key } from '../state/types'
import { EditorNode, type Lifecycle } from './editor-node'
import { TextNode } from './text'

declare module './types' {
  interface NodeMap {
    root: {
      entryValue: Key<'text'>
      jsonValue: { type: 'root'; text: string }
    }
  }
}

export class RootNode<L extends Lifecycle = Lifecycle> extends EditorNode<
  L,
  'root'
> {
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
