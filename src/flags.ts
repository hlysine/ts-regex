import { StringToArray } from './helper';

type Flags = 'd' | 'g' | 'i' | 'm' | 's' | 'u' | 'y';

export type FlagInfo = {
  [key in Flags]: boolean;
} & {
  error: string;
};

type CheckFlags<Arr extends string[], Error extends string = never> = Arr extends [
  infer First extends string,
  ...infer Rest extends string[]
]
  ? First extends Flags
    ? First extends Rest[number]
      ? CheckFlags<Rest, Error | `Duplicate flag '${First}'`>
      : CheckFlags<Rest, Error>
    : CheckFlags<Rest, Error | `Invalid flag '${First}'`>
  : Error;

export type ParseFlags<
  FlagString extends string,
  Arr extends string[] = StringToArray<FlagString>
> = string extends FlagString
  ? FlagInfo
  : {
      [key in Flags]: key extends Arr[number] ? true : false;
    } & {
      error: CheckFlags<Arr>;
    };
