export type Hexadecimal =
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
export type Decimal = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type Octal = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
export type Alphabet =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | '_';

export type StringToArray<T extends string, Arr extends any[] = []> = T extends `${infer Char}${infer Rest}`
  ? StringToArray<Rest, [...Arr, Char]>
  : Arr;

export type JoinString<Arr, Acc extends string = ''> = Arr extends [
  infer U extends string,
  ...infer Rest extends string[]
]
  ? JoinString<Rest, `${Acc}${U}`>
  : Acc;

export type StringLength<T extends string> = StringToArray<T>['length'];

export type GetLast<E, T extends E[]> = T extends [...E[], infer Tail extends E] ? Tail : unknown;

export type ReplaceLast<E, T extends E[], U extends E> = T extends [...infer Head, E] ? [...Head, U] : [U];

export type CheckHex<
  Expr extends string,
  Length extends number,
  Arr extends string[] = StringToArray<Expr>
> = Arr extends Hexadecimal[] ? (Arr['length'] extends Length ? true : false) : false;

export type CheckDecimal<
  Expr extends string,
  Length extends number,
  Arr extends string[] = StringToArray<Expr>
> = Arr extends Decimal[] ? (Arr['length'] extends Length ? true : false) : false;

export type CheckOctal<
  Expr extends string,
  Length extends number,
  Arr extends string[] = StringToArray<Expr>
> = Arr extends Octal[] ? (Arr['length'] extends Length ? true : false) : false;

export enum Comparison {
  Lower,
  Equal,
  Greater,
}

export type EditObject<Target extends object, Edit extends object> = Omit<Target, keyof Edit> & Edit;

/**
 * Adapted from https://github.com/type-challenges/type-challenges/issues/11444
 */
export type CompareInt<A extends string, B extends string> = A extends `-${infer AbsA}`
  ? B extends `-${infer AbsB}`
    ? ComparePositives<AbsB, AbsA>
    : Comparison.Lower
  : B extends `-${number}`
  ? Comparison.Greater
  : ComparePositives<A, B>;

type ComparePositives<
  A extends string,
  B extends string,
  ByLength = CompareByLength<A, B>
> = ByLength extends Comparison.Equal ? CompareByDigits<A, B> : ByLength;

type CompareByLength<A extends string, B extends string> = A extends `${infer _AF}${infer AR}`
  ? B extends `${infer _BF}${infer BR}`
    ? CompareByLength<AR, BR>
    : Comparison.Greater
  : B extends `${infer _BF}${infer _BR}`
  ? Comparison.Lower
  : Comparison.Equal;

type CompareByDigits<
  A extends string,
  B extends string
> = `${A}|${B}` extends `${infer AF}${infer AR}|${infer BF}${infer BR}`
  ? CompareDigits<AF, BF> extends Comparison.Equal
    ? CompareByDigits<AR, BR>
    : CompareDigits<AF, BF>
  : Comparison.Equal;

type CompareDigits<A extends string, B extends string> = A extends B
  ? Comparison.Equal
  : '0123456789' extends `${string}${A}${string}${B}${string}`
  ? Comparison.Lower
  : Comparison.Greater;
