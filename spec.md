# WYSIWYG Editor for Educational Material — Project Spec (PoC)

> Repo: `github.com/kulla/2025-08-25-editor-with-classes`

This document is the source of truth for the PoC. It’s LLM-friendly (Copilot/OpenAI). If code behavior changes, update this spec in the same PR.

---

## 1. Summary

A prototype WYSIWYG editor for educational content with structured data and enforced invariants. Multiple-choice exercises are atomic groups (you can’t partially delete structural parts). The editor uses class-based node types (Lexical-inspired) for rendering/behavior. The canonical model is a flat Yjs document.

**Stack**: TypeScript + React • rsbuild • biome • TailwindCSS (+ DaisyUI, when handy)
**Collaboration**: Yjs document in memory; provider TBD (PoC may run without network sync)

---

## 2. Goals & Non-Goals

### Goals

* Build a PoC to test the approach.
* Support structured blocks with hard invariants: Paragraph, Multiple-Choice Exercise.
* No rich text (plain text only) for simplicity.
* Real-time model based on Yjs (even single-user for now) to prove CRDT flows.
* Class per node (view/behavior), with all mutations centralized.
* Flat CRDT schema fit for selective subscriptions.
* Keyboard usage is fine, but A11y is out of scope for the PoC.
* No external plugin system.

### Non-Goals (PoC)

* Google-Docs-level features (comments/suggestions/footers/etc.)
* Presence cursors / selection highlights
* Tests and CI
* Export/import to external formats
* Data persistence (no IndexedDB/backend)

---

## 3. Prior Work & Rationale

* Continuation of `hackathoern-collab-oer-editor` (paragraphs + MC exercises)
* Fix pitfalls of generic editors (e.g., partial selection deleting required structure; see Lexical #7750). Structural invariants are mandatory

---

## 4. Target Users & Use Cases (PoC)

* Authors/teachers creating simple materials: paragraphs and MC exercises (multiple-correct only)
* Solo editing session (no presence UI)
* Validate that structural invariants keep the document consistent under basic edits

---

## 5. High-Level Architecture

* **EditorController** (core): commands → single mutation entry, Yjs transaction handling
* **Node classes** (view/behavior): React-facing classes that render and can suggest command rewrites, but never write to Yjs directly
* **Flat Yjs model**: a single `Y.Map` of nodes, with per-node `Y.Text` or `Y.Array<NodeId>` where appropriate; avoids deeply nested CRDTs
* **Renderer**: React views subscribe to granular slices (per node/text) for minimal re-renders

---

## 6. Tech Stack & Tooling

* Language: TypeScript ≥ 5.4
* UI: React 18, TailwindCSS, DaisyUI (optional)
* Build: rsbuild (Rspack)
* Lint/Format: biome
* Testing: none in PoC
* CRDT: yjs (no provider required for PoC)
* State binding: minimal hooks around Yjs (e.g., `useExternalSync` pattern)
* Theme: Dark mode default
* Devices: Desktop-first; no mobile workarounds planned
* License: Apache-2.0

---

## 7. Document Model (Flat Yjs)

> Yjs is the single source of truth. Class instances are ephemeral view helpers.

### Top-level collections

* `nodes: Y.Map<NodeId, NodeRecord>` — metadata and references per node

### Per-node dynamic values

* `value`: optional, type depends on node:

  * `text` → `Y.Text`
  * container nodes → `Y.Array<NodeId>` (children order)
  * leaf/atomic nodes without text → `boolean` or `number`

### Types

```ts
export type NodeId = string;
export type NodeType =
  | 'document'
  | 'paragraph'
  | 'text'                 // leaf holding Y.Text in value
  | 'exercise.mc'          // composite with two slots
  | 'exercise.mc.task'     // container: child is a 'text' (plain)
  | 'exercise.mc.options'  // container: ordered list of option nodes
  | 'exercise.mc.option';  // option node containing a 'text'

export interface NodeRecord {
  id: NodeId;
  type: NodeType;
  parent: NodeId | null;      // null only for 'document'
  value: Y.Text | Y.Array<NodeId> | Y.Map<NodeId>;
}
```

### Structure & Invariants

* `document` has a `value: Y.Array<NodeId>` (its children)
* `paragraph` has a `value: Y.Array<NodeId>` of exactly one child: a `text` node
* `text` has `value: Y.Text` (plain text; no marks/formatting)
* `exercise.mc` has exactly two children:

  1. `exercise.mc.task` → contains a `text` child
  2. `exercise.mc.options` → contains ≥ 2 `exercise.mc.option` nodes
* `exercise.mc.option` contains exactly one `text` child and may have `attrs.correct`
* **Atomicity**: any destructive op that touches `exercise.mc` structure must either affect the entire exercise or be blocked/rewritten
* **Correctness rule**: in multiple-correct mode, require ≥ 1 correct option

---

## 8. Selection Model (Simplified)

* **TextSelection**: `{ anchor: { nodeId, offset }, focus: { nodeId, offset } }` (only valid for `text` nodes)
* **NodeSelection**: `{ anchor: { nodeId }, focus: { nodeId } }`
* **Atomic grouping**: if a selection intersects structural parts of an exercise, it coerces to selecting the whole exercise

---

## 9. Commands & Transactions (Minimal Set)

All edits go through `EditorController.dispatch(cmd)` and run inside a Yjs transaction.

```ts
type Command =
  | { type: 'insertText'; at: { nodeId: NodeId; offset: number }; text: string }
  | { type: 'deleteRange'; range: TextRange | NodeRange }
  | { type: 'createParagraph'; after?: NodeId }
  | { type: 'createExerciseMC'; after?: NodeId }
  | ...
```

---

## 11. License

Apache-2.0
