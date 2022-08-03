import {
  CompareInt,
  Comparison,
  Decimal,
  EditObject,
  GetLast,
  Hexadecimal,
  Octal,
  ReplaceLast,
  StringToArray,
} from './helper';

type StrictMode = true extends typeof TSRegex.strict ? true : false;

type IfStrict<Strict, NotStrict> = StrictMode extends true ? Strict : NotStrict;

export declare enum NodeType {
  Literal = 'literal',

  Quantifier = 'quantifier',

  Lazy = 'lazy',

  HexCharEscape = 'hexCharEscape',
  UnicodeCharEscape = 'unicodeCharEscape',
  OctalCharEscape = 'octalCharEscape',

  CharClass = 'charClass', // include positive and negative char classes
  CharRange = 'charRange', // denoted by hyphen in a char class

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

interface ParseResult {
  tokens: string[];
  tree: Node[];
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

export interface UnclosedCharGroupError extends Node {
  type: NodeType.Error;
  value: 'Character class missing closing bracket.';
  children: [];
}

export interface InvalidRangeSyntaxError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `strict: '${Expr}' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.`;
  children: [];
}

export interface InvalidUnicodeCharError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `strict: '${Expr}' is not a valid unicode escape sequence and is being parsed literally. Do not escape the 'u' character when not in a unicode escape sequence.`;
  children: [];
}

export interface InvalidHexCharError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `strict: '${Expr}' is not a valid hexadecimal escape sequence and is being parsed literally. Do not escape the 'x' character when not in a hexadecimal escape sequence.`;
  children: [];
}

export interface ChainedRangeError extends Node {
  type: NodeType.Error;
  value: 'strict: A hyphen is placed in the middle of a character class but is treated literally. Considering escaping it or moving it to the start/end of the class.';
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

type CharRangeNode<Tree extends Node[], LastTreeNode = GetLast<Node, Tree>> = LastTreeNode extends Node & {
  type: NodeType.CharRange;
}
  ? CharGroupLiteralNode<Tree, { type: NodeType.Literal; value: '-'; children: IfStrict<[ChainedRangeError], []> }>
  : ReplaceLast<
      Node,
      Tree,
      {
        type: LastTreeNode extends Node ? NodeType.CharRange : NodeType.Literal;
        value: '-';
        children: LastTreeNode extends Node ? [LastTreeNode] : [];
      }
    >;

type CharGroupLiteralNode<
  Tree extends Node[],
  Literal extends Node & {
    type: NodeType.Literal | NodeType.HexCharEscape | NodeType.UnicodeCharEscape | NodeType.OctalCharEscape;
  },
  LastTreeNode = GetLast<Node, Tree>
> = LastTreeNode extends Node & { type: NodeType.CharRange }
  ? LastTreeNode['children']['length'] extends 1
    ? ReplaceLast<Node, Tree, EditObject<LastTreeNode, { children: [...LastTreeNode['children'], Literal] }>>
    : [...Tree, Literal]
  : [...Tree, Literal];

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

type CheckHex<
  Expr extends string,
  Length extends number,
  Arr extends string[] = StringToArray<Expr>
> = Arr extends Hexadecimal[] ? (Arr['length'] extends Length ? true : false) : false;

type CheckDecimal<
  Expr extends string,
  Length extends number,
  Arr extends string[] = StringToArray<Expr>
> = Arr extends Decimal[] ? (Arr['length'] extends Length ? true : false) : false;

type CheckOctal<
  Expr extends string,
  Length extends number,
  Arr extends string[] = StringToArray<Expr>
> = Arr extends Octal[] ? (Arr['length'] extends Length ? true : false) : false;

/**
 * If the next token is '?', parse it as a lazy quantifier, otherwise, resume normal parsing.
 */
type ParseLazy<Tokens extends string[], Tree extends Node[]> = Tokens extends ['?', ...infer Tail extends string[]]
  ? Parse<Tail, LazyNode<Tree>>
  : Parse<Tokens, Tree>;

type ParseCharClassResursive<Tokens extends string[], Tree extends Node[]> = Tokens extends [
  ']',
  ...infer Tail extends string[]
]
  ? { tree: Tree; tokens: Tail }
  : Tokens extends [`\\u${infer Unicode}`, ...infer Tail extends string[]] // parse unicode escapes
  ? CheckHex<Unicode, 4> extends true
    ? ParseCharClassResursive<
        Tail,
        CharGroupLiteralNode<Tree, { type: NodeType.UnicodeCharEscape; value: `\\u${Unicode}`; children: [] }>
      >
    : ParseCharClassResursive<
        Tail,
        CharGroupLiteralNode<
          Tree,
          {
            type: NodeType.Literal;
            value: `\\u${Unicode}`;
            children: IfStrict<[InvalidUnicodeCharError<`\\u${Unicode}`>], []>;
          }
        >
      >
  : Tokens extends [`\\x${infer Hex}`, ...infer Tail extends string[]] // parse hex escapes
  ? CheckHex<Hex, 2> extends true
    ? ParseCharClassResursive<
        Tail,
        CharGroupLiteralNode<Tree, { type: NodeType.HexCharEscape; value: `\\x${Hex}`; children: [] }>
      >
    : ParseCharClassResursive<
        Tail,
        CharGroupLiteralNode<
          Tree,
          {
            type: NodeType.Literal;
            value: `\\x${Hex}`;
            children: IfStrict<[InvalidHexCharError<`\\x${Hex}`>], []>;
          }
        >
      >
  : Tokens extends [`\\${infer Octal}`, ...infer Tail extends string[]] // parse octal escapes and indexed back-references, assuming they are all octal escapes for now
  ? CheckOctal<Octal, 1 | 2 | 3> extends true // check for octal in character class
    ? ParseCharClassResursive<
        Tail,
        CharGroupLiteralNode<Tree, { type: NodeType.OctalCharEscape; value: `\\${Octal}`; children: [] }>
      >
    : ParseCharClassResursive<
        Tail,
        CharGroupLiteralNode<Tree, { type: NodeType.Literal; value: `\\${Octal}`; children: [] }>
      > // parse normal backslash escapes
  : Tokens extends ['-', infer Next extends string, ...infer Rest extends string[]]
  ? Next extends ']'
    ? ParseCharClassResursive<
        [Next, ...Rest],
        CharGroupLiteralNode<Tree, { type: NodeType.Literal; value: '-'; children: [] }>
      > // don't make a char range if the char group is about to end
    : ParseCharClassResursive<[Next, ...Rest], CharRangeNode<Tree>>
  : Tokens extends [infer First extends string, ...infer Rest extends string[]]
  ? ParseCharClassResursive<Rest, CharGroupLiteralNode<Tree, { type: NodeType.Literal; value: First; children: [] }>>
  : { tree: [...Tree, UnclosedCharGroupError]; tokens: Tokens };

type ParseCharClass<
  OpeningToken extends string,
  Rest extends string[],
  Tree extends Node[],
  PeekResult extends ParseResult = ParseCharClassResursive<Rest, []>
> = Parse<
  PeekResult['tokens'],
  [...Tree, { type: NodeType.CharClass; value: OpeningToken; children: PeekResult['tree'] }]
>;

export type Parse<
  Tokens extends string[],
  Tree extends Node[] = [],
  // cached for performance
  SuspiciousRangeQuantifier extends string | false = LikeRangeQuantifier<Tokens>
> = Tokens extends [infer Head extends SingleCharQuantifier, ...infer Tail extends string[]] // parse single character quantifiers
  ? ParseLazy<Tail, QuantifyNode<Tree, Head>>
  : Tokens extends ['{', infer Min extends string, ',', infer Max extends string, '}', ...infer Tail extends string[]] // parse {n,m} quantifiers
  ? `${Min}|${Max}` extends `${number}|${number}`
    ? ParseLazy<Tail, QuantifyNodeWithNumber<Tree, Min, Max>>
    : Parse<
        Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: '{';
            children: IfStrict<[InvalidRangeSyntaxError<`{${Min},${Max}}`>], []>;
          }
        ]
      >
  : Tokens extends ['{', infer Limit extends string, '}', ...infer Tail extends string[]] // parse {n} quantifiers
  ? Limit extends `${number}`
    ? ParseLazy<Tail, QuantifyNodeWithNumber<Tree, Limit, Limit>>
    : Parse<
        Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: '{';
            children: IfStrict<[InvalidRangeSyntaxError<`{${Limit}}`>], []>;
          }
        ]
      >
  : SuspiciousRangeQuantifier extends string // parse other { } constructs that are not a valid range quantifier
  ? Parse<
      Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
      [
        ...Tree,
        {
          type: NodeType.Literal;
          value: '{';
          children: IfStrict<[InvalidRangeSyntaxError<SuspiciousRangeQuantifier>], []>;
        }
      ]
    >
  : Tokens extends [`\\u${infer Unicode}`, ...infer Tail extends string[]] // parse unicode escapes
  ? CheckHex<Unicode, 4> extends true
    ? Parse<Tail, [...Tree, { type: NodeType.UnicodeCharEscape; value: `\\u${Unicode}`; children: [] }]>
    : Parse<
        Tail,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: `\\u${Unicode}`;
            children: IfStrict<[InvalidUnicodeCharError<`\\u${Unicode}`>], []>;
          }
        ]
      >
  : Tokens extends [`\\x${infer Hex}`, ...infer Tail extends string[]] // parse hex escapes
  ? CheckHex<Hex, 2> extends true
    ? Parse<Tail, [...Tree, { type: NodeType.HexCharEscape; value: `\\x${Hex}`; children: [] }]>
    : Parse<
        Tail,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: `\\x${Hex}`;
            children: IfStrict<[InvalidHexCharError<`\\x${Hex}`>], []>;
          }
        ]
      >
  : Tokens extends [`\\${infer Octal}`, ...infer Tail extends string[]] // parse octal escapes and indexed back-references, assuming they are all octal escapes for now
  ? CheckDecimal<Octal, 1 | 2 | 3> extends true // check for decimal, not octal, because back-references uses decimal. todo: verify back-references in post-processing
    ? Parse<Tail, [...Tree, { type: NodeType.OctalCharEscape; value: `\\${Octal}`; children: [] }]>
    : Parse<Tail, [...Tree, { type: NodeType.Literal; value: `\\${Octal}`; children: [] }]> // parse normal backslash escapes
  : Tokens extends [infer First extends '[' | '[^', ...infer Tail extends string[]] // parse character class
  ? ParseCharClass<First, Tail, Tree>
  : Tokens extends [infer Head extends string, ...infer Tail extends string[]]
  ? Parse<Tail, [...Tree, { type: NodeType.Literal; value: Head; children: [] }]>
  : Tree;
