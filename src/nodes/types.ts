export type NodeType = keyof NodeMap

export type JSONValue<T extends NodeType> = NodeMap[T]['jsonValue']

export type EntryValue<T extends NodeType> = NodeMap[T]['entryValue']
