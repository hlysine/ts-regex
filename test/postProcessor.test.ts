import { NodeType, Parse } from '../src/parser';
import { PostProcess } from '../src/postProcessor';
import { Tokenize } from '../src/tokenizer';
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
          type: NodeType.NamedGroup;
          value: 'name';
          children: [];
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
          type: NodeType.BackReference;
          value: '3';
          children: [];
        },
        {
          type: NodeType.OctalCharEscape;
          value: '\\4';
          children: [
            {
              type: NodeType.Warning;
              value: "'\\4' is being parsed as an octal character escape sequence, which is banned because it is easily confused with a back-reference.";
              children: [];
            }
          ];
        },
        {
          type: NodeType.Error;
          value: "There are more than 1 group with the name 'name'.";
          children: [];
        }
      ],
      PostProcess<Parse<Tokenize<'((?<name>))(?<name>)\\1\\2\\3\\4'>>>
    >();
    checkType<
      [
        {
          type: NodeType.NamedGroup;
          value: 'name';
          children: [{ type: NodeType.Literal; value: ' '; children: [] }];
        },
        {
          type: NodeType.BackReference;
          value: 'name2';
          children: [
            { type: NodeType.Error; value: "The referenced group name 'name2' does not exist."; children: [] }
          ];
        }
      ],
      PostProcess<Parse<Tokenize<'(?<name> )\\k<name2>'>>>
    >();
    checkType<
      [
        {
          type: NodeType.OctalCharEscape;
          value: '\\123';
          children: [
            {
              type: NodeType.Warning;
              value: "'\\123' is being parsed as an octal character escape sequence, which is banned because it is easily confused with a back-reference.";
              children: [];
            }
          ];
        }
      ],
      PostProcess<Parse<Tokenize<'\\123'>>>
    >();
    checkType<
      [
        {
          type: NodeType.OctalCharEscape;
          value: '\\1';
          children: [
            {
              type: NodeType.Warning;
              value: "'\\1' is being parsed as an octal character escape sequence, which is banned because it is easily confused with a back-reference.";
              children: [];
            }
          ];
        },
        { type: NodeType.Literal; value: '9'; children: [] },
        { type: NodeType.Literal; value: '3'; children: [] },
        {
          type: NodeType.Warning;
          value: "'\\193' is not a valid octal escape sequence and part of it is being parsed literally.";
          children: [];
        }
      ],
      PostProcess<Parse<Tokenize<'\\193'>>>
    >();
    checkType<
      [
        {
          type: NodeType.OctalCharEscape;
          value: '\\7';
          children: [
            {
              type: NodeType.Warning;
              value: "'\\7' is being parsed as an octal character escape sequence, which is banned because it is easily confused with a back-reference.";
              children: [];
            }
          ];
        },
        {
          type: NodeType.Literal;
          value: '\\8';
          children: [{ type: NodeType.Warning; value: "'\\8' has no special meaning but is escaped."; children: [] }];
        },
        {
          type: NodeType.Warning;
          value: "'\\8' is not a valid octal escape sequence and part of it is being parsed literally.";
          children: [];
        },
        {
          type: NodeType.Literal;
          value: '\\9';
          children: [{ type: NodeType.Warning; value: "'\\9' has no special meaning but is escaped."; children: [] }];
        },
        {
          type: NodeType.Warning;
          value: "'\\9' is not a valid octal escape sequence and part of it is being parsed literally.";
          children: [];
        }
      ],
      PostProcess<Parse<Tokenize<'\\7\\8\\9'>>>
    >();
    checkType<
      [
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            {
              type: NodeType.Warning;
              value: 'There are multiple alternation branches with identical content.';
              children: [];
            }
          ];
        },
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            {
              type: NodeType.Warning;
              value: 'There are multiple alternation branches with identical content.';
              children: [];
            }
          ];
        },
        { type: NodeType.Alternation; value: '|'; children: [] }
      ],
      PostProcess<Parse<Tokenize<'||'>>>
    >();
    checkType<
      [
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            {
              type: NodeType.Lookaround;
              value: '(?<=';
              children: [
                {
                  type: NodeType.Group;
                  value: '(';
                  children: [
                    {
                      type: NodeType.Quantifier;
                      value: '?';
                      children: [
                        {
                          type: NodeType.Literal;
                          value: 'a';
                          children: [];
                        }
                      ];
                    }
                  ];
                }
              ];
            },
            {
              type: NodeType.Warning;
              value: 'There are multiple alternation branches with identical content.';
              children: [];
            }
          ];
        },
        {
          type: NodeType.Alternation;
          value: '|';
          children: [
            {
              type: NodeType.Lookaround;
              value: '(?<=';
              children: [
                {
                  type: NodeType.Group;
                  value: '(';
                  children: [
                    {
                      type: NodeType.Quantifier;
                      value: '?';
                      children: [
                        {
                          type: NodeType.Literal;
                          value: 'a';
                          children: [];
                        }
                      ];
                    }
                  ];
                }
              ];
            }
          ];
        }
      ],
      PostProcess<Parse<Tokenize<'(?<=(a?))|(?<=(a?))'>>>
    >();
  });
});
