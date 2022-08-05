import {
  Alphabet,
  CheckDecimal,
  CheckHex,
  CheckOctal,
  CompareInt,
  Comparison,
  Decimal,
  EditObject,
  GetLast,
  IfStrict,
  ReplaceLast,
  StringToArray,
} from './helper';

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
  Warning = 'warning',
}

type SingleCharQuantifier = '*' | '+' | '?';

type LookaroundOpening = '(?=' | '(?!' | '(?<=' | '(?<!';

type GroupOpening = '(?:' | '(';

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

export interface NoOpenParenthesisError extends Node {
  type: NodeType.Error;
  value: 'Close parenthesis exists without a matching open parenthesis.';
  children: [];
}

export interface UnclosedParenthesisError extends Node {
  type: NodeType.Error;
  value: 'Group missing close parenthesis.';
  children: [];
}

export interface InvalidGroupNameError<Expr extends string> extends Node {
  type: NodeType.Error;
  value: `'${Expr}' is an invalid name for capture group. It must be alphanumeric and must not start with a digit.`;
  children: [];
}

export interface InvalidRangeSyntaxWarning<Expr extends string> extends Node {
  type: NodeType.Warning;
  value: `'${Expr}' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.`;
  children: [];
}

export interface InvalidUnicodeCharWarning<Expr extends string> extends Node {
  type: NodeType.Warning;
  value: `'${Expr}' is not a valid unicode escape sequence and is being parsed literally. Do not escape the 'u' character when not in a unicode escape sequence.`;
  children: [];
}

export interface InvalidHexCharWarning<Expr extends string> extends Node {
  type: NodeType.Warning;
  value: `'${Expr}' is not a valid hexadecimal escape sequence and is being parsed literally. Do not escape the 'x' character when not in a hexadecimal escape sequence.`;
  children: [];
}

export interface ChainedRangeWarning extends Node {
  type: NodeType.Warning;
  value: 'A hyphen is placed in the middle of a character class but is treated literally. Considering escaping it or moving it to the start/end of the class.';
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
 * Get all nodes that are not wrapped in an alternation node.
 */
type GetUnwrappedNodes<Tree extends Node[]> = Tree extends [
  { type: NodeType.Alternation },
  ...infer Rest extends Node[]
]
  ? GetUnwrappedNodes<Rest>
  : Tree;

/**
 * Build an alternation node for one option of the alternation token '|'.
 */
type AlternationNode<
  Tree extends Node[],
  UnwrappedNodes extends Node[] = GetUnwrappedNodes<Tree>
> = UnwrappedNodes extends []
  ? [...Tree, { type: NodeType.Alternation; value: '|'; children: [] }]
  : Tree extends [...infer Options extends Node[], ...UnwrappedNodes]
  ? [...Options, { type: NodeType.Alternation; value: '|'; children: UnwrappedNodes }]
  : Tree; // this should never be hit

/**
 * Build a node for the '-' character in a character class.
 */
type CharRangeNode<Tree extends Node[], LastTreeNode = GetLast<Node, Tree>> = LastTreeNode extends Node & {
  type: NodeType.CharRange;
}
  ? CharGroupLiteralNode<Tree, { type: NodeType.Literal; value: '-'; children: IfStrict<[ChainedRangeWarning], []> }>
  : ReplaceLast<
      Node,
      Tree,
      {
        type: LastTreeNode extends Node ? NodeType.CharRange : NodeType.Literal;
        value: '-';
        children: LastTreeNode extends Node ? [LastTreeNode] : [];
      }
    >;

/**
 * Build a literal node in a character class, placing it in a previous char range if possible.
 */
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

type CheckGroupName<Expr extends string> = Expr extends `${infer Char}${infer Rest}`
  ? Char extends Alphabet
    ? StringToArray<Rest> extends (Alphabet | Decimal)[]
      ? true
      : false
    : false
  : false;

/**
 * If the next token is '?', parse it as a lazy quantifier, otherwise, resume normal parsing.
 */
type ParseLazy<Tokens extends string[], Tree extends Node[], InGroup extends boolean> = Tokens extends [
  '?',
  ...infer Tail extends string[]
]
  ? ParseNormal<Tail, LazyNode<Tree>, InGroup>
  : ParseNormal<Tokens, Tree, InGroup>;

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
            children: IfStrict<[InvalidUnicodeCharWarning<`\\u${Unicode}`>], []>;
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
            children: IfStrict<[InvalidHexCharWarning<`\\x${Hex}`>], []>;
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
  InGroup extends boolean,
  PeekResult extends ParseResult = ParseCharClassResursive<Rest, []>
> = ParseNormal<
  PeekResult['tokens'],
  [...Tree, { type: NodeType.CharClass; value: OpeningToken; children: PeekResult['tree'] }],
  InGroup
>;

type ParseGroup<
  OpeningToken extends string,
  Rest extends string[],
  Tree extends Node[],
  InGroup extends boolean,
  Subtree extends Node[] = [],
  PeekResult extends ParseResult = ParseNormal<Rest, Subtree, true>
> = ParseNormal<
  PeekResult['tokens'],
  [
    ...Tree,
    {
      type: OpeningToken extends LookaroundOpening ? NodeType.Lookaround : NodeType.Group;
      value: OpeningToken;
      children: PeekResult['tree'];
    }
  ],
  InGroup
>;

type ParseNamedGroup<
  Name extends string,
  Rest extends string[],
  Tree extends Node[],
  InGroup extends boolean,
  PeekResult extends ParseResult = ParseNormal<Rest, [], true>
> = ParseNormal<
  PeekResult['tokens'],
  [
    ...Tree,
    {
      type: NodeType.NamedGroup;
      value: Name;
      children: [...(CheckGroupName<Name> extends false ? [InvalidGroupNameError<Name>] : []), ...PeekResult['tree']];
    }
  ],
  InGroup
>;

type ParseNormal<
  Tokens extends string[],
  Tree extends Node[] = [],
  InGroup extends boolean = false,
  // cached for performance
  SuspiciousRangeQuantifier extends string | false = LikeRangeQuantifier<Tokens>
> = Tokens extends ['|', ...infer Tail extends string[]]
  ? ParseNormal<Tail, AlternationNode<Tree>, InGroup>
  : Tokens extends [')', ...infer Tail extends string[]]
  ? InGroup extends true
    ? Tree extends [{ type: NodeType.Alternation }, ...Node[]]
      ? { tokens: Tail; tree: AlternationNode<Tree> }
      : { tokens: Tail; tree: Tree }
    : ParseNormal<Tail, [...Tree, { type: NodeType.Literal; value: ')'; children: [NoOpenParenthesisError] }], InGroup>
  : Tokens extends ['(?<', ...infer Tail extends string[]]
  ? Tail extends [infer Name extends string, '>', ...infer Rest extends string[]]
    ? ParseNamedGroup<Name, Rest, Tree, InGroup>
    : ParseGroup<
        '(',
        Tail,
        Tree,
        InGroup,
        [
          { type: NodeType.Quantifier; value: '?'; children: [ExpectTokenBeforeQuantifierError] },
          { type: NodeType.Literal; value: '<'; children: [] }
        ]
      >
  : Tokens extends [infer Opening extends LookaroundOpening | GroupOpening, ...infer Tail extends string[]]
  ? ParseGroup<Opening, Tail, Tree, InGroup>
  : Tokens extends [infer Head extends SingleCharQuantifier, ...infer Tail extends string[]] // parse single character quantifiers
  ? ParseLazy<Tail, QuantifyNode<Tree, Head>, InGroup>
  : Tokens extends ['{', infer Min extends string, ',', infer Max extends string, '}', ...infer Tail extends string[]] // parse {n,m} quantifiers
  ? `${Min}|${Max}` extends `${number}|${number}`
    ? ParseLazy<Tail, QuantifyNodeWithNumber<Tree, Min, Max>, InGroup>
    : ParseNormal<
        Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: '{';
            children: IfStrict<[InvalidRangeSyntaxWarning<`{${Min},${Max}}`>], []>;
          }
        ],
        InGroup
      >
  : Tokens extends ['{', infer Limit extends string, '}', ...infer Tail extends string[]] // parse {n} quantifiers
  ? Limit extends `${number}`
    ? ParseLazy<Tail, QuantifyNodeWithNumber<Tree, Limit, Limit>, InGroup>
    : ParseNormal<
        Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: '{';
            children: IfStrict<[InvalidRangeSyntaxWarning<`{${Limit}}`>], []>;
          }
        ],
        InGroup
      >
  : SuspiciousRangeQuantifier extends string // parse other { } constructs that are not a valid range quantifier
  ? ParseNormal<
      Tokens extends [string, ...infer Remaining extends string[]] ? Remaining : Tokens,
      [
        ...Tree,
        {
          type: NodeType.Literal;
          value: '{';
          children: IfStrict<[InvalidRangeSyntaxWarning<SuspiciousRangeQuantifier>], []>;
        }
      ],
      InGroup
    >
  : Tokens extends ['\\k<', ...infer Tail extends string[]]
  ? Tail extends [infer Name extends string, '>', ...infer Rest extends string[]]
    ? CheckGroupName<Name> extends true
      ? ParseNormal<Rest, [...Tree, { type: NodeType.BackReference; value: Name; children: [] }], InGroup>
      : ParseNormal<
          Rest,
          [
            ...Tree,
            {
              type: NodeType.Literal;
              value: Name;
              children: [InvalidGroupNameError<Name>];
            }
          ],
          InGroup
        >
    : ParseNormal<
        Tail,
        [
          ...Tree,
          { type: NodeType.Literal; value: '\\k'; children: [] },
          { type: NodeType.Literal; value: '<'; children: [] }
        ],
        InGroup
      >
  : Tokens extends [`\\u${infer Unicode}`, ...infer Tail extends string[]] // parse unicode escapes
  ? CheckHex<Unicode, 4> extends true
    ? ParseNormal<Tail, [...Tree, { type: NodeType.UnicodeCharEscape; value: `\\u${Unicode}`; children: [] }], InGroup>
    : ParseNormal<
        Tail,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: `\\u${Unicode}`;
            children: IfStrict<[InvalidUnicodeCharWarning<`\\u${Unicode}`>], []>;
          }
        ],
        InGroup
      >
  : Tokens extends [`\\x${infer Hex}`, ...infer Tail extends string[]] // parse hex escapes
  ? CheckHex<Hex, 2> extends true
    ? ParseNormal<Tail, [...Tree, { type: NodeType.HexCharEscape; value: `\\x${Hex}`; children: [] }], InGroup>
    : ParseNormal<
        Tail,
        [
          ...Tree,
          {
            type: NodeType.Literal;
            value: `\\x${Hex}`;
            children: IfStrict<[InvalidHexCharWarning<`\\x${Hex}`>], []>;
          }
        ],
        InGroup
      >
  : Tokens extends [`\\${infer Octal}`, ...infer Tail extends string[]] // parse octal escapes and indexed back-references, assuming they are all octal escapes for now
  ? CheckDecimal<Octal, 1 | 2 | 3> extends true // check for decimal, not octal, because back-references uses decimal. todo: verify back-references in post-processing
    ? ParseNormal<Tail, [...Tree, { type: NodeType.OctalCharEscape; value: `\\${Octal}`; children: [] }], InGroup>
    : ParseNormal<Tail, [...Tree, { type: NodeType.Literal; value: `\\${Octal}`; children: [] }], InGroup> // parse normal backslash escapes
  : Tokens extends [infer First extends '[' | '[^', ...infer Tail extends string[]] // parse character class
  ? ParseCharClass<First, Tail, Tree, InGroup>
  : Tokens extends [infer Head extends string, ...infer Tail extends string[]]
  ? ParseNormal<Tail, [...Tree, { type: NodeType.Literal; value: Head; children: [] }], InGroup>
  : Tree extends [{ type: NodeType.Alternation }, ...Node[]]
  ? InGroup extends true
    ? { tokens: Tokens; tree: [...AlternationNode<Tree>, UnclosedParenthesisError] }
    : { tokens: Tokens; tree: AlternationNode<Tree> }
  : InGroup extends true
  ? { tokens: Tokens; tree: [...Tree, UnclosedParenthesisError] }
  : { tokens: Tokens; tree: Tree };

export type Parse<Tokens extends string[]> = ParseNormal<Tokens>['tree'];
