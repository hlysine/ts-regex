// done: convert octal escape sequences to indexed back-reference
// done: ban octal escape sequences in strict mode
// done: check for duplicate named groups
// done: check for unresolved named references
// todo: check for indexed back-references for named groups
// todo: check for duplicate alternation branches
// done: check for useless character escapes

import { Alphabet, CheckOctal, CompareInt, Comparison, Decimal, EditObject, IfStrict, Octal } from './helper';
import { Node, NodeType } from './parser';

export interface DuplicateNamedReferenceError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `There are more than 1 group with the name '${Expr}'.`;
  children: [];
}

export interface UnresolvedNamedReferenceError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `The referenced group name '${Expr}' does not exist.`;
  children: [];
}

export interface InvalidOctalCharWarning<Expr extends string> extends Node {
  type: NodeType.Warning;
  value: `'${Expr}' is not a valid octal escape sequence and part of it is being parsed literally.`;
  children: [];
}

export interface BanOctalCharWarning<Expr extends string> extends Node {
  type: NodeType.Warning;
  value: `'${Expr}' is being parsed as an octal character escape sequence, which is banned because it is easily confused with a back-reference.`;
  children: [];
}

export interface UselessCharEscapeWarning<Expr extends string> extends Node {
  type: NodeType.Warning;
  value: `'${Expr}' has no special meaning but is escaped.`;
  children: [];
}

type ParseLiterally<Expr extends string, Tree extends Node[] = []> = Expr extends `${infer Char}${infer Rest}`
  ? ParseLiterally<Rest, [...Tree, { type: NodeType.Literal; value: Char; children: [] }]>
  : Tree;

type ParseInvalidOctalChar<
  Expr extends string,
  OctalSequence extends string = ''
> = Expr extends `${infer Char}${infer Rest}`
  ? Char extends Octal
    ? ParseInvalidOctalChar<Rest, `${OctalSequence}${Char}`>
    : OctalSequence extends ''
    ? [{ type: NodeType.Literal; value: `\\${Char}`; children: [] }, ...ParseLiterally<Rest>]
    : [
        {
          type: NodeType.OctalCharEscape;
          value: `\\${OctalSequence}`;
          children: IfStrict<[BanOctalCharWarning<`\\${OctalSequence}`>], []>;
        },
        ...ParseLiterally<Expr>
      ]
  : OctalSequence extends ''
  ? []
  : [
      {
        type: NodeType.OctalCharEscape;
        value: `\\${OctalSequence}`;
        children: IfStrict<[BanOctalCharWarning<`\\${OctalSequence}`>], []>;
      }
    ];

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

type ProcessIndexedReferences<
  TreeTail extends Node[],
  TreeHead extends Node[],
  References extends (string | null)[]
> = TreeTail extends [infer Head extends Node, ...infer Tail extends Node[]]
  ? Head extends Node & { type: NodeType.OctalCharEscape }
    ? Head['value'] extends `\\${infer Index}`
      ? CompareInt<Index, `${References['length']}`> extends Comparison.Greater
        ? CheckOctal<Index, 1 | 2 | 3> extends true
          ? ProcessIndexedReferences<
              Tail,
              [
                ...TreeHead,
                EditObject<
                  Head,
                  { children: [...Head['children'], ...IfStrict<[BanOctalCharWarning<`\\${Index}`>], []>] }
                >
              ],
              References
            >
          : ProcessIndexedReferences<
              Tail,
              [...TreeHead, ...ParseInvalidOctalChar<Index>, InvalidOctalCharWarning<`\\${Index}`>],
              References
            >
        : ProcessIndexedReferences<
            Tail,
            [...TreeHead, { type: NodeType.BackReference; value: Index; children: Head['children'] }],
            References
          >
      : ProcessIndexedReferences<Tail, [...TreeHead, Head], References> // this should never be hit
    : ProcessIndexedReferences<
        Tail,
        [...TreeHead, EditObject<Head, { children: ProcessIndexedReferences<Head['children'], [], References> }>],
        References
      >
  : TreeHead;

type ProcessNamedReferences<
  TreeTail extends Node[],
  TreeHead extends Node[],
  References extends (string | null)[]
> = TreeTail extends [infer Head extends Node, ...infer Tail extends Node[]]
  ? Head extends Node & { type: NodeType.BackReference }
    ? Head['value'] extends References[number]
      ? ProcessNamedReferences<Tail, [...TreeHead, Head], References>
      : ProcessNamedReferences<
          Tail,
          [
            ...TreeHead,
            EditObject<Head, { children: [...Head['children'], UnresolvedNamedReferenceError<Head['value']>] }>
          ],
          References
        >
    : ProcessNamedReferences<
        Tail,
        [...TreeHead, EditObject<Head, { children: ProcessNamedReferences<Head['children'], [], References> }>],
        References
      >
  : TreeHead;

type ProcessCharEscapes<TreeTail extends Node[], TreeHead extends Node[]> = TreeTail extends [
  infer Head extends Node,
  ...infer Tail extends Node[]
]
  ? Head extends Node & { type: NodeType.Literal }
    ? Head['value'] extends `\\${infer Char}`
      ? Char extends Alphabet | Decimal
        ? ProcessCharEscapes<
            Tail,
            [
              ...TreeHead,
              EditObject<Head, { children: [...Head['children'], UselessCharEscapeWarning<Head['value']>] }>
            ]
          >
        : ProcessCharEscapes<Tail, [...TreeHead, Head]>
      : ProcessCharEscapes<Tail, [...TreeHead, Head]>
    : ProcessCharEscapes<Tail, [...TreeHead, EditObject<Head, { children: ProcessCharEscapes<Head['children'], []> }>]>
  : TreeHead;

type CheckDuplicateNames<Tree extends Node[], References extends (string | null)[]> = References extends [
  infer Head extends string | null,
  ...infer Tail extends (string | null)[]
]
  ? Head extends string
    ? Head extends Tail[number]
      ? CheckDuplicateNames<[...Tree, DuplicateNamedReferenceError<Head>], Tail>
      : CheckDuplicateNames<Tree, Tail>
    : CheckDuplicateNames<Tree, Tail>
  : Tree;

export type ProcessReferences<
  Tree extends Node[],
  References extends (string | null)[] = CollectReferences<Tree>
> = ProcessCharEscapes<
  CheckDuplicateNames<
    ProcessIndexedReferences<ProcessNamedReferences<Tree, [], References>, [], References>,
    References
  >,
  []
>;
