import { CollectReferences, PostProcess } from './postProcessor';
import { FlagInfo, ParseFlags } from './flags';
import { Node, NodeType, Parse } from './parser';
import { Tokenize } from './tokenizer';

type GetValuesByNode<Type extends NodeType, Tree extends Node, Values extends string = never> = Tree extends {
  type: Type;
  value: infer E extends string;
}
  ? Values | E
  : Tree['children']['length'] extends 0
  ? never
  : GetValuesByNode<Type, Tree['children'][number], Values>;

export type CollectMessages<Tree extends Node[], Strict extends boolean = true> =
  | GetValuesByNode<NodeType.Error, Tree[number]>
  | (Strict extends true ? GetValuesByNode<NodeType.Warning, Tree[number]> : never);

type BuildTree<Expr extends string> = PostProcess<Parse<Tokenize<Expr>>>;

type CheckPattern<
  Pattern extends string,
  Tree extends Node[],
  Strict extends boolean = true,
  Messages = CollectMessages<Tree, Strict>
> = [Messages] extends [never] ? Pattern : Messages;

type CheckFlags<FlagString extends string, Info extends FlagInfo> = [Info['error']] extends [never]
  ? FlagString
  : Info['error'];

type BuildFlagString<Info extends FlagInfo> = string extends Info[keyof Info]
  ? string
  : `${Info['d'] extends true ? 'd' : ''}${Info['g'] extends true ? 'g' : ''}${Info['i'] extends true
      ? 'i'
      : ''}${Info['m'] extends true ? 'm' : ''}${Info['s'] extends true ? 's' : ''}${Info['u'] extends true
      ? 'u'
      : ''}${Info['y'] extends true ? 'y' : ''}`;

type BuildExecArray<
  References extends (string | null)[],
  IndexedGroups extends string[] = [string],
  NamedGroups extends Record<string, string> = {}
> = References extends [infer First extends string | null, ...infer Rest extends (string | null)[]]
  ? First extends string
    ? BuildExecArray<Rest, [...IndexedGroups, string], NamedGroups & { [key in First]: string }>
    : BuildExecArray<Rest, [...IndexedGroups, string], NamedGroups>
  : IndexedGroups & { groups: NamedGroups; index: number; input: string };

interface TypedRegExp<
  Pattern extends string,
  Tree extends Node[],
  Info extends FlagInfo,
  References extends (string | null)[] = CollectReferences<Tree>
> extends RegExp {
  /**
   * Executes a search on a string using a regular expression pattern, and returns an array containing the results of that search.
   * @param target The String object or string literal on which to perform the search.
   */
  exec(target: string): BuildExecArray<References> | null;

  /**
   * Returns a Boolean value that indicates whether or not a pattern exists in a searched string.
   * @param target String on which to perform the search.
   */
  test(target: string): boolean;

  /** Returns a copy of the text of the regular expression pattern. Read-only. The regExp argument is a Regular expression object. It can be a variable name or a literal. */
  readonly source: Pattern;

  /** Returns a Boolean value indicating the state of the global flag (g) used with a regular expression. Default is false. Read-only. */
  readonly global: Info['g'];

  /** Returns a Boolean value indicating the state of the ignoreCase flag (i) used with a regular expression. Default is false. Read-only. */
  readonly ignoreCase: Info['i'];

  /** Returns a Boolean value indicating the state of the multiline flag (m) used with a regular expression. Default is false. Read-only. */
  readonly multiline: Info['m'];

  /** Returns a Boolean value indicating the state of the dotAll flag (s) used with a regular expression. Default is false. Read-only. */
  readonly dotAll: Info['s'];

  /**
   * Returns a string indicating the flags of the regular expression in question. This field is read-only.
   * The characters in this string are sequenced and concatenated in the following order:
   *
   *    - "g" for global
   *    - "i" for ignoreCase
   *    - "m" for multiline
   *    - "u" for unicode
   *    - "y" for sticky
   *
   * If no flags are set, the value is the empty string.
   */
  readonly flags: BuildFlagString<Info>;

  /**
   * Returns a Boolean value indicating the state of the sticky flag (y) used with a regular
   * expression. Default is false. Read-only.
   */
  readonly sticky: Info['y'];

  /**
   * Returns a Boolean value indicating the state of the Unicode flag (u) used with a regular
   * expression. Default is false. Read-only.
   */
  readonly unicode: Info['u'];

  lastIndex: number;
}

export function regex<
  Pattern extends string = string,
  Flags extends string = string,
  Tree extends Node[] = BuildTree<Pattern>,
  Info extends FlagInfo = ParseFlags<Flags>
>(pattern: CheckPattern<Pattern, Tree, true>, flags?: CheckFlags<Flags, Info>): TypedRegExp<Pattern, Tree, Info> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new RegExp(pattern as string, flags) as any;
}

declare global {
  // eslint-disable-next-line id-blacklist
  interface String {
    /**
     * Matches a string or an object that supports being matched against, and returns an array
     * containing the results of that search, or null if no matches are found.
     * @param matcher An object that supports being matched against.
     */
    match<Tree extends Node[] = Node[]>(
      matcher: { [Symbol.match](target: string): RegExpMatchArray | null } | TypedRegExp<string, Tree, FlagInfo>
    ): Node[] extends Tree ? RegExpMatchArray | null : BuildExecArray<CollectReferences<Tree>> | null;

    /**
     * Matches a string with a regular expression, and returns an iterable of matches
     * containing the results of that search.
     * @param regexp A variable name or string literal containing the regular expression pattern and flags.
     */
    matchAll<Tree extends Node[] = Node[]>(
      regexp: RegExp | TypedRegExp<string, Tree, FlagInfo>
    ): Node[] extends Tree
      ? IterableIterator<RegExpMatchArray>
      : IterableIterator<BuildExecArray<CollectReferences<Tree>>>;
  }
}
