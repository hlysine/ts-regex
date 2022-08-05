import '../src/strict';
import { NodeType, Parse, ProcessIndexedReferences, Tokenize } from '../src/index';
import { checkType } from './testUtils';

describe('post processor', () => {
  it('processes group references', () => {
    checkType<
      [
        {
          type: NodeType.Group;
          value: '(';
          children: [
            {
              type: NodeType.NamedGroup;
              value: 'name';
              children: [];
            }
          ];
        },
        {
          type: NodeType.BackReference;
          value: '1';
          children: [];
        },
        {
          type: NodeType.BackReference;
          value: '2';
          children: [];
        },
        {
          type: NodeType.OctalCharEscape;
          value: '\\3';
          children: [];
        }
      ],
      ProcessIndexedReferences<Parse<Tokenize<'((?<name>))\\1\\2\\3'>>>
    >();
  });
});
