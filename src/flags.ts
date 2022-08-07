import { StringToArray } from './helper';

type Flags = 'd' | 'g' | 'i' | 'm' | 's' | 'u' | 'y';

export type FlagInfo = {
  [key in Flags]: boolean;
} & {
  errors: string[];
};

type CheckFlags<Arr extends string[], Errors extends string[] = []> = Arr extends [
  infer First extends string,
  ...infer Rest extends string[]
]
  ? First extends Flags
    ? First extends Rest[number]
      ? CheckFlags<Rest, [...Errors, `Duplicate flag '${First}'`]>
      : CheckFlags<Rest, Errors>
    : CheckFlags<Rest, [...Errors, `Invalid flag '${First}'`]>
  : Errors;

export type ParseFlags<
  FlagString extends string,
  Arr extends string[] = StringToArray<FlagString>
> = string extends FlagString
  ? FlagInfo
  : {
      [key in Flags]: key extends Arr[number] ? true : false;
    } & {
      errors: CheckFlags<Arr>;
    };
