/**
 * Union of all possible node types (NodeMap is defined in each node file
 * via `declare module`)
 */
export type NodeType = keyof NodeMap

/**
 * The external JSON representation of a node
 */
export type JSONValue<T extends NodeType> = NodeMap[T]['jsonValue']

/**
 * The internal (flat) representation of a node's value
 */
export type EntryValue<T extends NodeType> = NodeMap[T]['entryValue']
