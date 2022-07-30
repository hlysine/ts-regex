export type StringToArray<T extends string, Arr extends any[] = []> = T extends `${infer Char}${infer Rest}`
  ? StringToArray<Rest, [...Arr, Char]>
  : Arr;

export type StringLength<T extends string> = StringToArray<T>['length'];
