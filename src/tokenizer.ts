import { StringLength } from './helper';

type Hexadecimal =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F';
type Decimal = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/**
 * Handles both `\uffff` and `\xff` sequences. Expects Sequence to be `\u` or `\x` when first called.
 */
type TokenizeHexSequence<
  Expr extends string,
  Length extends number,
  Sequence extends string,
  Tokens extends string[]
> = StringLength<Sequence> extends Length
  ? Tokenize<Expr, [...Tokens, Sequence]>
  : Expr extends `${infer Char}${infer Rest}`
  ? Char extends Hexadecimal
    ? TokenizeHexSequence<Rest, Length, `${Sequence}${Char}`, Tokens>
    : Tokenize<Expr, [...Tokens, Sequence]>
  : Sequence extends ''
  ? Tokens
  : [...Tokens, Sequence];

/**
 * Handles `\123` sequences, which may be an octal character escape sequence or a indexed group back-reference.
 */
type TokenizeNumberSequence<
  Expr extends string,
  Sequence extends string,
  Tokens extends string[]
> = StringLength<Sequence> extends 4
  ? Tokenize<Expr, [...Tokens, Sequence]>
  : Expr extends `${infer Char}${infer Rest}`
  ? Char extends Decimal
    ? TokenizeNumberSequence<Rest, `${Sequence}${Char}`, Tokens>
    : Tokenize<Expr, [...Tokens, Sequence]>
  : Sequence extends ''
  ? Tokens
  : [...Tokens, Sequence];

/**
 * Handle `name>` sequences for named capture groups and named back-references.
 */
type TokenizeNamedGroup<Expr extends string, Tokens extends string[]> = Expr extends `${infer Name}>${infer Rest}`
  ? Tokenize<Rest, [...Tokens, Name, '>']>
  : Expr extends `>${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '>']>
  : Tokenize<Expr>;

/**
 * Patches the given token list to escape the last token if it is a `{`.
 * This is used when the rest of the expression doesn't fit the `{n,m}` or `{n}` quantifier syntax.
 */
type EscapeBracket<Tokens extends string[]> = Tokens extends [...infer Head, infer Tail]
  ? Tail extends '{'
    ? [...Head, '\\{']
    : Tokens
  : Tokens;

/**
 * Handle `123,` or `123}` sequences for the {n,m} and {n} quantifiers.
 */
type TokenizeBracketQuantifierStart<
  Expr extends string,
  Sequence extends string,
  Tokens extends string[]
> = Expr extends `${infer Char}${infer Rest}`
  ? Char extends Decimal
    ? TokenizeBracketQuantifierStart<Rest, `${Sequence}${Char}`, Tokens>
    : Char extends '}'
    ? Sequence extends ''
      ? Tokenize<Rest, [...EscapeBracket<Tokens>, Char]>
      : Tokenize<Rest, [...Tokens, Sequence, Char]>
    : Char extends ','
    ? TokenizeBracketQuantifierEnd<Rest, Sequence, '', Tokens>
    : Tokenize<`${Sequence}${Expr}`, EscapeBracket<Tokens>>
  : Sequence extends ''
  ? EscapeBracket<Tokens>
  : Tokenize<Sequence, EscapeBracket<Tokens>>;

/**
 * Handle `123}` sequences for the {n,m} and {n} quantifiers.
 */
type TokenizeBracketQuantifierEnd<
  Expr extends string,
  // the whole bracket structure will be parsed literally if it's not a valid quantifier,
  // so we need to keep track of the sequence before the comma in case we need to revert
  // The pending sequence excludes the trailing comma
  PendingSequence extends string,
  Sequence extends string,
  Tokens extends string[]
> = Expr extends `${infer Char}${infer Rest}`
  ? Char extends Decimal
    ? TokenizeBracketQuantifierEnd<Rest, PendingSequence, `${Sequence}${Char}`, Tokens>
    : Char extends '}'
    ? Tokenize<Rest, [...Tokens, PendingSequence, ',', Sequence, Char]>
    : Tokenize<`${PendingSequence},${Sequence}${Expr}`, EscapeBracket<Tokens>>
  : Tokenize<`${PendingSequence},${Sequence}`, EscapeBracket<Tokens>>;

/**
 * Handles all escape sequences that starts with `\`
 */
type TokenizeEscapeSequence<Expr extends string, Tokens extends string[]> = Expr extends `\\x${infer Rest}` // 1 byte hexadecimal escape sequence
  ? TokenizeHexSequence<Rest, 4, `\\x`, Tokens>
  : Expr extends `\\u${infer Rest}` // 2 byte hexadecimal escape sequence
  ? TokenizeHexSequence<Rest, 6, `\\u`, Tokens>
  : Expr extends `\\k<${infer Rest}` // named back-reference
  ? TokenizeNamedGroup<Rest, [...Tokens, '\\k<']>
  : Expr extends `\\${infer Char}${infer Rest}`
  ? Char extends Decimal // octal escape sequence or indexed group back-reference
    ? TokenizeNumberSequence<Rest, `\\${Char}`, Tokens>
    : Tokenize<Rest, [...Tokens, `\\${Char}`]>
  : Tokenize<Expr, Tokens>;

/**
 * Handles the content of a character class, where many characters are taken literally.
 */
type TokenizeCharClass<Expr extends string, Tokens extends string[]> = Expr extends `\\${string}`
  ? TokenizeEscapeSequence<Expr, Tokens>
  : Expr extends `]${infer Rest}`
  ? Tokenize<Rest, [...Tokens, ']']>
  : Expr extends `${infer Char}${infer Rest}`
  ? TokenizeCharClass<Rest, [...Tokens, Char]>
  : [Tokens];

/**
 * Tokenize a regular expression.
 */
export type Tokenize<Expr extends string, Tokens extends string[] = []> = Expr extends `\\${string}`
  ? TokenizeEscapeSequence<Expr, Tokens>
  : Expr extends `{${infer Rest}`
  ? TokenizeBracketQuantifierStart<Rest, '', [...Tokens, '{']>
  : Expr extends `(?<=${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '(?<=']>
  : Expr extends `(?<!${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '(?<!']>
  : Expr extends `(?=${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '(?=']>
  : Expr extends `(?!${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '(?!']>
  : Expr extends `(?:${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '(?:']>
  : Expr extends `(?<${infer Rest}`
  ? TokenizeNamedGroup<Rest, [...Tokens, '(?<']>
  : Expr extends `(${infer Rest}`
  ? Tokenize<Rest, [...Tokens, '(']>
  : Expr extends `[^${infer Rest}`
  ? TokenizeCharClass<Rest, [...Tokens, '[^']>
  : Expr extends `[${infer Rest}`
  ? TokenizeCharClass<Rest, [...Tokens, '[']>
  : Expr extends `${infer Char}${infer Rest}`
  ? Tokenize<Rest, [...Tokens, Char]>
  : Tokens;
