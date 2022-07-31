import { NodeType, Parse, Tokenize } from '../src/index';
import { checkType } from './testUtils';

describe('parser', () => {
  it('parses correctly', () => {
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        { type: NodeType.Literal; value: 'b'; children: [] },
        { type: NodeType.Literal; value: 'c'; children: [] }
      ],
      Parse<Tokenize<'abc'>>
    >();
    checkType<
      [
        { type: NodeType.Quantifier; value: '+'; children: [{ type: NodeType.Literal; value: 'a'; children: [] }] },
        { type: NodeType.Quantifier; value: '*'; children: [{ type: NodeType.Literal; value: 'b'; children: [] }] },
        { type: NodeType.Quantifier; value: '?'; children: [{ type: NodeType.Literal; value: 'c'; children: [] }] }
      ],
      Parse<Tokenize<'a+b*c?'>>
    >();
    checkType<
      [{ type: NodeType.Quantifier; value: '?'; children: [{ type: NodeType.Error; value: string; children: [] }] }],
      Parse<Tokenize<'?'>>
    >();
  });
});
