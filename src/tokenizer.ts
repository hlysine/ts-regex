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
