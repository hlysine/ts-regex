// todo: convert octal escape sequences to indexed back-reference
// todo: ban octal escape sequences in strict mode
// todo: check for duplicate named groups
// todo: check for unresolved named references
// todo: check for indexed back-references for named groups
// todo: check for duplicate alternation branches

import { CompareInt, Comparison, EditObject } from './helper';
import { Node, NodeType } from './parser';

type CollectReferences<Tree extends Node[], References extends (string | null)[] = []> = Tree extends [
  infer Head extends Node,
  ...infer Tail extends Node[]
]
  ? Head extends Node & { type: NodeType.NamedGroup }
    ? CollectReferences<Tail, [...References, Head['value'], ...CollectReferences<Head['children']>]>
    : Head extends Node & { type: NodeType.Group; value: '(' }
    ? CollectReferences<Tail, [...References, null, ...CollectReferences<Head['children']>]>
    : CollectReferences<Tail, [...References, ...CollectReferences<Head['children']>]>
  : References;

type ProcessIndexedReferencesRecursive<
  TreeTail extends Node[],
  TreeHead extends Node[],
  References extends (string | null)[]
> = TreeTail extends [infer Head extends Node, ...infer Tail extends Node[]]
  ? Head extends Node & { type: NodeType.OctalCharEscape }
    ? Head['value'] extends `\\${infer Index}`
      ? CompareInt<Index, `${References['length']}`> extends Comparison.Greater
        ? ProcessIndexedReferencesRecursive<Tail, [...TreeHead, Head], References>
        : ProcessIndexedReferencesRecursive<
            Tail,
            [...TreeHead, { type: NodeType.BackReference; value: Index; children: Head['children'] }],
            References
          >
      : ProcessIndexedReferencesRecursive<Tail, [...TreeHead, Head], References>
    : ProcessIndexedReferencesRecursive<
        Tail,
        [
          ...TreeHead,
          EditObject<Head, { children: ProcessIndexedReferencesRecursive<Head['children'], [], References> }>
        ],
        References
      >
  : TreeHead;

export type ProcessIndexedReferences<Tree extends Node[]> = ProcessIndexedReferencesRecursive<
  Tree,
  [],
  CollectReferences<Tree>
>;
