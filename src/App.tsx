import { useEffect } from 'react'
import './App.css'
import { DebugPanel } from './components/debug-panel'
import { useEditorState } from './hooks/use-editor-state'
import { RootNode } from './nodes/root'

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
