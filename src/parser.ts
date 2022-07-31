import { GetLast, ReplaceLast } from './helper';

export enum NodeType {
  Literal = 'literal',

  Quantifier = 'quantifier',
  RepeatMin = 'repeatMin',
  RepeatMax = 'repeatMax',

  Lazy = 'lazy',

  HexCharEscape = 'hexCharEscape',
  UnicodeCharEscape = 'unicodeCharEscape',
  OctalCharEscape = 'octalCharEscape',

  CharClass = 'charClass', // include positive and negative char classes

  Lookaround = 'lookaround', // include 4 types of lookaround

  NamedGroup = 'namedGroup',
  Group = 'group', // include capture and non-capture groups

  BackReference = 'backReference',

  Error = 'error',
}

type SingleCharQuantifier = '*' | '+' | '?';

interface Node {
  type: NodeType;
  value: string;
  children: Node[];
}

export type Parse<
  Tokens extends string[],
  Tree extends Node[] = [],
  LastTreeNode = GetLast<Node, Tree>
> = Tokens extends [infer Head extends string, ...infer Tail extends string[]]
  ? Head extends SingleCharQuantifier
    ? Parse<
        Tail,
        ReplaceLast<
          Node,
          Tree,
          {
            type: NodeType.Quantifier;
            value: Head;
            children: [
              LastTreeNode extends Node
                ? LastTreeNode
                : { type: NodeType.Error; value: 'Token expected before quantifier'; children: [] }
            ];
          }
        >
      >
    : Parse<Tail, [...Tree, { type: NodeType.Literal; value: Head; children: [] }]>
  : Tree;
