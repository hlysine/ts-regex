import { Decimal, Hexadecimal, Octal, StringLength } from './helper';

declare enum TokenizerState {
  Normal = 'normal',
  CharGroup = 'charGroup',
}

type TokenizeByState<
  State extends TokenizerState,
  Expr extends string,
  Tokens extends string[]
> = State extends TokenizerState.Normal ? Tokenize<Expr, Tokens> : TokenizeCharClass<Expr, Tokens>;

/**
 * Handles both `\uffff` and `\xff` sequences. Expects Sequence to be `\u` or `\x` when first called.
 */
type TokenizeHexSequence<
  State extends TokenizerState,
  Expr extends string,
  Length extends number,
  Sequence extends string,
  Tokens extends string[]
> = StringLength<Sequence> extends Length
  ? TokenizeByState<State, Expr, [...Tokens, Sequence]>
  : Expr extends `${infer Char}${infer Rest}`
  ? Char extends Hexadecimal
    ? TokenizeHexSequence<State, Rest, Length, `${Sequence}${Char}`, Tokens>
    : TokenizeByState<State, Expr, [...Tokens, Sequence]>
  : Sequence extends ''
  ? Tokens
  : [...Tokens, Sequence];

/**
 * Handles `\123` sequences, which may be an octal character escape sequence or a indexed group back-reference.
 */
type TokenizeNumberSequence<
  State extends TokenizerState,
  Expr extends string,
  Sequence extends string,
  Tokens extends string[]
> = StringLength<Sequence> extends 4
  ? TokenizeByState<State, Expr, [...Tokens, Sequence]>
  : Expr extends `${infer Char}${infer Rest}`
  ? State extends TokenizerState.Normal
    ? Char extends Decimal
      ? TokenizeNumberSequence<State, Rest, `${Sequence}${Char}`, Tokens>
      : TokenizeByState<State, Expr, [...Tokens, Sequence]>
    : Char extends Octal
    ? TokenizeNumberSequence<State, Rest, `${Sequence}${Char}`, Tokens>
    : TokenizeByState<State, Expr, [...Tokens, Sequence]>
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
  : Tokenize<Expr, Tokens>;

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
      ? Tokenize<Rest, [...Tokens, Char]>
      : Tokenize<Rest, [...Tokens, Sequence, Char]>
    : Char extends ','
    ? TokenizeBracketQuantifierEnd<Rest, Sequence, '', Tokens>
    : Tokenize<`${Sequence}${Expr}`, Tokens>
  : Sequence extends ''
  ? Tokens
  : Tokenize<Sequence, Tokens>;

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
    : Tokenize<`${PendingSequence},${Sequence}${Expr}`, Tokens>
  : Tokenize<`${PendingSequence},${Sequence}`, Tokens>;

/**
 * Handles all escape sequences that starts with `\`
 */
type TokenizeEscapeSequence<
  State extends TokenizerState,
  Expr extends string,
  Tokens extends string[]
> = Expr extends `\\x${infer Rest}` // 1 byte hexadecimal escape sequence
  ? TokenizeHexSequence<State, Rest, 4, `\\x`, Tokens>
  : Expr extends `\\u${infer Rest}` // 2 byte hexadecimal escape sequence
  ? TokenizeHexSequence<State, Rest, 6, `\\u`, Tokens>
  : Expr extends `\\k<${infer Rest}` // named back-reference
  ? TokenizeNamedGroup<Rest, [...Tokens, '\\k<']>
  : Expr extends `\\${infer Char}${infer Rest}`
  ? State extends TokenizerState.Normal
    ? Char extends Decimal // octal escape sequence or indexed group back-reference
      ? TokenizeNumberSequence<State, Rest, `\\${Char}`, Tokens>
      : TokenizeByState<State, Rest, [...Tokens, `\\${Char}`]>
    : Char extends Octal // must be octal escape sequence in character groups
    ? TokenizeNumberSequence<State, Rest, `\\${Char}`, Tokens>
    : TokenizeByState<State, Rest, [...Tokens, `\\${Char}`]>
  : TokenizeByState<State, Expr, Tokens>;

/**
 * Handles the content of a character class, where many characters are taken literally.
 */
type TokenizeCharClass<Expr extends string, Tokens extends string[]> = Expr extends `\\${string}`
  ? TokenizeEscapeSequence<TokenizerState.CharGroup, Expr, Tokens>
  : Expr extends `]${infer Rest}`
  ? Tokenize<Rest, [...Tokens, ']']>
  : Expr extends `${infer Char}${infer Rest}`
  ? TokenizeCharClass<Rest, [...Tokens, Char]>
  : Tokens;

/**
 * Tokenize a regular expression.
 */
export type Tokenize<Expr extends string, Tokens extends string[] = []> = Expr extends `\\${string}`
  ? TokenizeEscapeSequence<TokenizerState.Normal, Expr, Tokens>
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
