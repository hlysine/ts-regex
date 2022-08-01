import '../src/strict';
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
    checkType<
      [
        {
          type: NodeType.Quantifier;
          value: '10,0';
          children: [
            { type: NodeType.Error; value: 'Quantifier range is out of order (min: 10, max: 0).'; children: [] },
            { type: NodeType.Error; value: 'Token expected before quantifier.'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'{10,0}'>>
    >();
    checkType<
      [{ type: NodeType.Quantifier; value: '0,10'; children: [{ type: NodeType.Literal; value: '.'; children: [] }] }],
      Parse<Tokenize<'.{0,10}'>>
    >();
    checkType<
      [{ type: NodeType.Quantifier; value: '10,10'; children: [{ type: NodeType.Literal; value: '.'; children: [] }] }],
      Parse<Tokenize<'.{10}'>>
    >();
    checkType<
      [
        {
          type: NodeType.Lazy;
          value: '?';
          children: [
            {
              type: NodeType.Quantifier;
              value: '10,10';
              children: [{ type: NodeType.Literal; value: '.'; children: [] }];
            }
          ];
        }
      ],
      Parse<Tokenize<'.{10}?'>>
    >();
    checkType<
      [
        {
          type: NodeType.Lazy;
          value: '?';
          children: [
            { type: NodeType.Quantifier; value: '?'; children: [{ type: NodeType.Literal; value: '.'; children: [] }] }
          ];
        }
      ],
      Parse<Tokenize<'.??'>>
    >();
    checkType<
      [
        {
          type: NodeType.Lazy;
          value: '?';
          children: [
            { type: NodeType.Quantifier; value: '?'; children: [{ type: NodeType.Literal; value: '.'; children: [] }] }
          ];
        },
        {
          type: NodeType.Quantifier;
          value: '?';
          children: [{ type: NodeType.Error; value: 'The previous token is already quantified.'; children: [] }];
        }
      ],
      Parse<Tokenize<'.???'>>
    >();
    checkType<
      [{ type: NodeType.Quantifier; value: '3,3'; children: [{ type: NodeType.Literal; value: '.'; children: [] }] }],
      Parse<Tokenize<'.{3}'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: '.'; children: [] },
        {
          type: NodeType.Literal;
          value: '{';
          children: [
            {
              type: NodeType.Error;
              value: "strict: '{3 }' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.";
              children: [];
            }
          ];
        },
        { type: NodeType.Literal; value: '3'; children: [] },
        { type: NodeType.Literal; value: ' '; children: [] },
        { type: NodeType.Literal; value: '}'; children: [] }
      ],
      Parse<Tokenize<'.{3 }'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: '.'; children: [] },
        {
          type: NodeType.Literal;
          value: '{';
          children: [
            {
              type: NodeType.Error;
              value: "strict: '{3,2 }' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.";
              children: [];
            }
          ];
        },
        { type: NodeType.Literal; value: '3'; children: [] },
        { type: NodeType.Literal; value: ','; children: [] },
        { type: NodeType.Literal; value: '2'; children: [] },
        { type: NodeType.Literal; value: ' '; children: [] },
        { type: NodeType.Literal; value: '}'; children: [] }
      ],
      Parse<Tokenize<'.{3,2 }'>>
    >();
  });
});
