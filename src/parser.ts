import { CompareInt, Comparison, Decimal, GetLast, ReplaceLast } from './helper';

type StrictMode = true extends typeof TSRegex.strict ? true : false;

export declare enum NodeType {
  Literal = 'literal',

  Quantifier = 'quantifier',

  Lazy = 'lazy',

  HexCharEscape = 'hexCharEscape',
  UnicodeCharEscape = 'unicodeCharEscape',
  OctalCharEscape = 'octalCharEscape',

  CharClass = 'charClass', // include positive and negative char classes

  Lookaround = 'lookaround', // include 4 types of lookaround

  NamedGroup = 'namedGroup',
  Group = 'group', // include capture and non-capture groups
  Alternation = 'alternation',

  BackReference = 'backReference',

  Error = 'error',
}

type SingleCharQuantifier = '*' | '+' | '?';

export interface Node {
  type: NodeType;
  value: string;
  children: Node[];
}

export interface ExpectQuantifierBeforeLazyError extends Node {
  type: NodeType.Error;
  value: 'Quantifier expected before lazy specifier';
  children: [];
}

export interface TokenAlreadyQuantifiedError extends Node {
  type: NodeType.Error;
  value: 'The previous token is already quantified.';
  children: [];
}

export interface ExpectTokenBeforeQuantifierError extends Node {
  type: NodeType.Error;
  value: 'Token expected before quantifier.';
  children: [];
}

export interface RangeOutOfOrderError<Min extends string, Max extends string> extends Node {
  type: NodeType.Error;
  value: `Quantifier range is out of order (min: ${Min}, max: ${Max}).`;
  children: [];
}

export interface InvalidRangeSyntaxError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `strict: '${Expr}' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.`;
  children: [];
}

/**
 * Build a lazy node.
 */
type LazyNode<Tree extends Node[], LastTreeNode = GetLast<Node, Tree>> = ReplaceLast<
  Node,
  Tree,
  {
    type: NodeType.Lazy;
    value: '?';
    children: [
      LastTreeNode extends Node & { type: NodeType.Quantifier } ? LastTreeNode : ExpectQuantifierBeforeLazyError
    ];
  }
>;

/**
 * Build a quantifier node for the given quantifier string.
 */
type QuantifyNode<
  Tree extends Node[],
  Quantifier extends string,
  LastTreeNode = GetLast<Node, Tree>
> = LastTreeNode extends Node & { type: NodeType.Quantifier | NodeType.Lazy }
  ? [
      ...Tree,
      {
        type: NodeType.Quantifier;
        value: Quantifier;
        children: [TokenAlreadyQuantifiedError];
      }
    ]
  : ReplaceLast<
      Node,
      Tree,
      {
        type: NodeType.Quantifier;
        value: Quantifier;
        children: [LastTreeNode extends Node ? LastTreeNode : ExpectTokenBeforeQuantifierError];
      }
    >;

/**
 * Build and verify a quantifier node for the `{n,m}` quantifier.
 */
type QuantifyNodeWithNumber<
  Tree extends Node[],
  Min extends string,
  Max extends string,
  LastTreeNode = GetLast<Node, Tree>
> = LastTreeNode extends Node & { type: NodeType.Quantifier | NodeType.Lazy }
  ? [
      ...Tree,
      {
        type: NodeType.Quantifier;
        value: `${Min},${Max}`;
        children: [TokenAlreadyQuantifiedError];
      }
    ]
  : ReplaceLast<
      Node,
      Tree,
      {
        type: NodeType.Quantifier;
        value: `${Min},${Max}`;
        children: [
          ...(CompareInt<Min, Max> extends Comparison.Greater ? [RangeOutOfOrderError<Min, Max>] : []),
          LastTreeNode extends Node ? LastTreeNode : ExpectTokenBeforeQuantifierError
        ];
      }
    >;

/**
 * Recursive continuation of LikeRangeQuantifier.
 */
type CheckSuspiciousQuantifier<Tokens extends string[], Sequence extends string> = Tokens extends [
  infer First,
  ...infer Rest extends string[]
]
  ? First extends Decimal | ',' | ' ' | '.' | 'e' | 'E' | '+' | '-'
    ? CheckSuspiciousQuantifier<Rest, `${Sequence}${First}`>
    : First extends '}'
    ? `${Sequence}}`
    : false
  : false;

/**
 * Check whether the beginning part of a token list looks like a range quantifier.
 * Returns the range quantifier if it is, otherwise returns false.
 */
type LikeRangeQuantifier<Tokens extends string[]> = Tokens extends [infer First, ...infer Rest extends string[]]
  ? First extends '{'
    ? CheckSuspiciousQuantifier<Rest, '{'>
    : false
  : false;

/**
 * If the next token is '?', parse it as a lazy quantifier, otherwise, resume normal parsing.
 */
type ParseLazy<Tokens extends string[], Tree extends Node[]> = Tokens extends ['?', ...infer Tail extends string[]]
  ? Parse<Tail, LazyNode<Tree>>
  : Parse<Tokens, Tree>;

export type Parse<
  Tokens extends string[],
  Tree extends Node[] = [],
  // cached for performance
  SuspiciousRangeQuantifier extends string | false = LikeRangeQuantifier<Tokens>
> = Tokens extends [infer Head extends SingleCharQuantifier, ...infer Tail extends string[]]
  ? ParseLazy<Tail, QuantifyNode<Tree, Head>>
  : Tokens extends ['{', infer Min extends string, ',', infer Max extends string, '}', ...infer Tail extends string[]]
  ? `${Min}|${Max}` extends `${number}|${number}`
    ? ParseLazy<Tail, QuantifyNodeWithNumber<Tree, Min, Max>>
    : Parse<
        Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: '{';
            children: [...(StrictMode extends true ? [InvalidRangeSyntaxError<`{${Min},${Max}}`>] : [])];
          }
        ]
      >
  : Tokens extends ['{', infer Limit extends string, '}', ...infer Tail extends string[]]
  ? Limit extends `${number}`
    ? ParseLazy<Tail, QuantifyNodeWithNumber<Tree, Limit, Limit>>
    : Parse<
        Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: '{';
            children: [...(StrictMode extends true ? [InvalidRangeSyntaxError<`{${Limit}}`>] : [])];
          }
        ]
      >
  : SuspiciousRangeQuantifier extends string
  ? Parse<
      Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
      [
        ...Tree,
        {
          type: NodeType.Literal;
          value: '{';
          children: [...(StrictMode extends true ? [InvalidRangeSyntaxError<SuspiciousRangeQuantifier>] : [])];
        }
      ]
    >
  : Tokens extends [infer Head extends string, ...infer Tail extends string[]]
  ? Parse<Tail, [...Tree, { type: NodeType.Literal; value: Head; children: [] }]>
  : Tree;
