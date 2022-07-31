export type StringToArray<T extends string, Arr extends any[] = []> = T extends `${infer Char}${infer Rest}`
  ? StringToArray<Rest, [...Arr, Char]>
  : Arr;

export type StringLength<T extends string> = StringToArray<T>['length'];

export type GetLast<E, T extends E[]> = T extends [...E[], infer Tail extends E] ? Tail : unknown;

export type ReplaceLast<E, T extends E[], U extends E> = T extends [...infer Head, E] ? [...Head, U] : [U];
