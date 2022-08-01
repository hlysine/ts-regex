import { Node, NodeType } from './parser';

type UnionErrors<Tree extends Node, Errors extends string = never> = Tree extends {
  type: NodeType.Error;
  value: infer E;
}
  ? Errors | E
  : Tree['children']['length'] extends 0
  ? never
  : UnionErrors<Tree['children'][number], Errors>;

export type CollectErrors<Tree extends Node[]> = UnionErrors<Tree[number]>;
