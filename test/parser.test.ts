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
              type: NodeType.Warning;
              value: "'{3 }' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.";
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
              type: NodeType.Warning;
              value: "'{3,2 }' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.";
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
    checkType<
      [
        { type: NodeType.Literal; value: '.'; children: [] },
        { type: NodeType.Literal; value: '{'; children: [] },
        { type: NodeType.Literal; value: 'o'; children: [] }
      ],
      Parse<Tokenize<'.{o'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: '.'; children: [] },
        {
          type: NodeType.Literal;
          value: '{';
          children: [
            {
              type: NodeType.Warning;
              value: "'{o}' is not a valid range syntax and is being parsed literally. Escape the '{' character to silence this warning.";
              children: [];
            }
          ];
        },
        { type: NodeType.Literal; value: 'o'; children: [] },
        { type: NodeType.Literal; value: '}'; children: [] }
      ],
      Parse<Tokenize<'.{o}'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        {
          type: NodeType.UnicodeCharEscape;
          value: '\\u12f4';
          children: [];
        },
        { type: NodeType.Literal; value: 'f'; children: [] }
      ],
      Parse<Tokenize<'a\\u12f4f'>>
    >();
    checkType<
      [
        {
          type: NodeType.Literal;
          value: '\\u12';
          children: [
            {
              type: NodeType.Warning;
              value: "'\\u12' is not a valid unicode escape sequence and is being parsed literally. Do not escape the 'u' character when not in a unicode escape sequence.";
              children: [];
            }
          ];
        },
        { type: NodeType.Literal; value: 'g'; children: [] },
        { type: NodeType.Literal; value: '4'; children: [] }
      ],
      Parse<Tokenize<'\\u12g4'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        {
          type: NodeType.HexCharEscape;
          value: '\\x12';
          children: [];
        },
        { type: NodeType.Literal; value: 'f'; children: [] },
        { type: NodeType.Literal; value: '4'; children: [] },
        { type: NodeType.Literal; value: 'f'; children: [] }
      ],
      Parse<Tokenize<'a\\x12f4f'>>
    >();
    checkType<
      [
        {
          type: NodeType.Literal;
          value: '\\x1';
          children: [
            {
              type: NodeType.Warning;
              value: "'\\x1' is not a valid hexadecimal escape sequence and is being parsed literally. Do not escape the 'x' character when not in a hexadecimal escape sequence.";
              children: [];
            }
          ];
        },
        { type: NodeType.Literal; value: 'u'; children: [] },
        { type: NodeType.Literal; value: 'g'; children: [] },
        { type: NodeType.Literal; value: '4'; children: [] }
      ],
      Parse<Tokenize<'\\x1ug4'>>
    >();
    checkType<[{ type: NodeType.OctalCharEscape; value: '\\1'; children: [] }], Parse<Tokenize<'\\1'>>>();
    checkType<[{ type: NodeType.OctalCharEscape; value: '\\123'; children: [] }], Parse<Tokenize<'\\123'>>>();
    checkType<
      [
        { type: NodeType.OctalCharEscape; value: '\\1'; children: [] },
        { type: NodeType.Literal; value: 'u'; children: [] }
      ],
      Parse<Tokenize<'\\1u'>>
    >();
    checkType<[{ type: NodeType.Literal; value: '\\^'; children: [] }], Parse<Tokenize<'\\^'>>>();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            { type: NodeType.Literal; value: 'b'; children: [] },
            { type: NodeType.Literal; value: 'c'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'a[bc]'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            { type: NodeType.Literal; value: 'b'; children: [] },
            { type: NodeType.Error; value: 'Character class missing closing bracket.'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'a[b'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            { type: NodeType.HexCharEscape; value: '\\x4f'; children: [] },
            { type: NodeType.Literal; value: 'f'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'[\\x4ff]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            { type: NodeType.UnicodeCharEscape; value: '\\u4ff2'; children: [] },
            { type: NodeType.Literal; value: 'f'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'[\\u4ff2f]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            { type: NodeType.OctalCharEscape; value: '\\1'; children: [] },
            { type: NodeType.Literal; value: '9'; children: [] },
            { type: NodeType.Literal; value: '2'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'[\\192]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            {
              type: NodeType.CharRange;
              value: '-';
              children: [
                { type: NodeType.Literal; value: 'a'; children: [] },
                { type: NodeType.Literal; value: 'z'; children: [] }
              ];
            }
          ];
        }
      ],
      Parse<Tokenize<'[a-z]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            {
              type: NodeType.CharRange;
              value: '-';
              children: [
                { type: NodeType.HexCharEscape; value: '\\x00'; children: [] },
                { type: NodeType.HexCharEscape; value: '\\xff'; children: [] }
              ];
            }
          ];
        }
      ],
      Parse<Tokenize<'[\\x00-\\xff]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            {
              type: NodeType.CharRange;
              value: '-';
              children: [
                { type: NodeType.OctalCharEscape; value: '\\0'; children: [] },
                { type: NodeType.OctalCharEscape; value: '\\123'; children: [] }
              ];
            },
            { type: NodeType.Literal; value: '('; children: [] },
            { type: NodeType.Literal; value: '?'; children: [] },
            { type: NodeType.Literal; value: ':'; children: [] },
            { type: NodeType.Literal; value: ')'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'[\\0-\\123(?:)]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            {
              type: NodeType.CharRange;
              value: '-';
              children: [
                { type: NodeType.Literal; value: '-'; children: [] },
                { type: NodeType.Literal; value: 'a'; children: [] }
              ];
            }
          ];
        }
      ],
      Parse<Tokenize<'[--a]'>>
    >();
    checkType<
      [
        {
          type: NodeType.CharClass;
          value: '[';
          children: [
            { type: NodeType.Literal; value: '-'; children: [] },
            { type: NodeType.Literal; value: 'z'; children: [] },
            {
              type: NodeType.CharRange;
              value: '-';
              children: [
                { type: NodeType.Literal; value: 'A'; children: [] },
                { type: NodeType.Literal; value: 'Z'; children: [] }
              ];
            },
            { type: NodeType.Literal; value: '0'; children: [] },
            { type: NodeType.Literal; value: '-'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'[-zA-Z0-]'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        { type: NodeType.Literal; value: 'b'; children: [] },
        { type: NodeType.Lookaround; value: '(?='; children: [{ type: NodeType.Literal; value: 'c'; children: [] }] }
      ],
      Parse<Tokenize<'ab(?=c)'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        {
          type: NodeType.Lookaround;
          value: '(?=';
          children: [
            { type: NodeType.Literal; value: 'c'; children: [] },
            {
              type: NodeType.CharClass;
              value: '[';
              children: [
                {
                  type: NodeType.CharRange;
                  value: '-';
                  children: [
                    { type: NodeType.Literal; value: 'd'; children: [] },
                    { type: NodeType.Literal; value: 'e'; children: [] }
                  ];
                },
                { type: NodeType.Literal; value: 'f'; children: [] }
              ];
            },
            {
              type: NodeType.Lookaround;
              value: '(?<!';
              children: [
                { type: NodeType.Literal; value: 'g'; children: [] },
                { type: NodeType.Literal; value: 'h'; children: [] }
              ];
            },
            { type: NodeType.Literal; value: 'i'; children: [] }
          ];
        },
        { type: NodeType.Literal; value: 'j'; children: [] },
        {
          type: NodeType.Literal;
          value: ')';
          children: [
            {
              type: NodeType.Error;
              value: 'Close parenthesis exists without a matching open parenthesis.';
              children: [];
            }
          ];
        }
      ],
      Parse<Tokenize<'a(?=c[d-ef](?<!gh)i)j)'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        { type: NodeType.Literal; value: 'b'; children: [] },
        { type: NodeType.NamedGroup; value: 'name'; children: [{ type: NodeType.Literal; value: 'c'; children: [] }] }
      ],
      Parse<Tokenize<'ab(?<name>c)'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        { type: NodeType.Literal; value: 'b'; children: [] },
        {
          type: NodeType.NamedGroup;
          value: 'na()me';
          children: [
            {
              type: NodeType.Error;
              value: "'na()me' is an invalid name for capture group. It must be alphanumeric and must not start with a digit.";
              children: [];
            },
            { type: NodeType.Literal; value: 'c'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'ab(?<na()me>c)'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        { type: NodeType.Literal; value: 'b'; children: [] },
        {
          type: NodeType.NamedGroup;
          value: '';
          children: [
            {
              type: NodeType.Error;
              value: "'' is an invalid name for capture group. It must be alphanumeric and must not start with a digit.";
              children: [];
            },
            { type: NodeType.Literal; value: 'c'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'ab(?<>c)'>>
    >();
    checkType<
      [
        { type: NodeType.Literal; value: 'a'; children: [] },
        { type: NodeType.Literal; value: 'b'; children: [] },
        {
          type: NodeType.Group;
          value: '(';
          children: [
            {
              type: NodeType.Quantifier;
              value: '?';
              children: [
                {
                  type: NodeType.Error;
                  value: 'Token expected before quantifier.';
                  children: [];
                }
              ];
            },
            { type: NodeType.Literal; value: '<'; children: [] },
            { type: NodeType.Literal; value: 'c'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'ab(?<c)'>>
    >();
    checkType<
      [
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            { type: NodeType.Literal; value: 'a'; children: [] },
            { type: NodeType.Literal; value: 'b'; children: [] }
          ];
        },
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            { type: NodeType.Literal; value: 'c'; children: [] },
            { type: NodeType.Literal; value: 'd'; children: [] }
          ];
        },
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            { type: NodeType.Literal; value: 'e'; children: [] },
            { type: NodeType.Literal; value: 'f'; children: [] }
          ];
        }
      ],
      Parse<Tokenize<'ab|cd|ef'>>
    >();
    checkType<
      [
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            {
              type: NodeType.Group;
              value: '(';
              children: [
                {
                  type: NodeType.Alternation;
                  value: '|';
                  children: [
                    { type: NodeType.Literal; value: 'a'; children: [] },
                    { type: NodeType.Literal; value: 'b'; children: [] }
                  ];
                },
                {
                  type: NodeType.Alternation;
                  value: '|';
                  children: [
                    { type: NodeType.Literal; value: 'c'; children: [] },
                    { type: NodeType.Literal; value: 'd'; children: [] }
                  ];
                },
                {
                  type: NodeType.Alternation;
                  value: '|';
                  children: [
                    { type: NodeType.Literal; value: 'e'; children: [] },
                    { type: NodeType.Literal; value: 'f'; children: [] }
                  ];
                }
              ];
            }
          ];
        },
        {
          type: NodeType.Alternation;
          value: '|';
          children: [{ type: NodeType.Literal; value: 'd'; children: [] }];
        }
      ],
      Parse<Tokenize<'(ab|cd|ef)|d'>>
    >();
    checkType<
      [
        {
          type: NodeType.Group;
          value: '(';
          children: [
            {
              type: NodeType.Alternation;
              value: '|';
              children: [];
            },
            {
              type: NodeType.Alternation;
              value: '|';
              children: [
                {
                  type: NodeType.Group;
                  value: '(';
                  children: [
                    {
                      type: NodeType.Error;
                      value: 'Group missing close parenthesis.';
                      children: [];
                    }
                  ];
                }
              ];
            },
            {
              type: NodeType.Error;
              value: 'Group missing close parenthesis.';
              children: [];
            }
          ];
        }
      ],
      Parse<Tokenize<'(|('>>
    >();
  });
});
