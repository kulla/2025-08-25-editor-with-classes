import './App.css'
import { useEffect } from 'react'
import { DebugPanel } from './components/debug-panel'
import { useEditorState } from './hooks/use-editor-state'
import { EditorNode, type Lifecycle } from './nodes/editor-node'
import { TextNode } from './nodes/text'
import type { Key } from './state/types'

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

declare module './nodes/types' {
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
