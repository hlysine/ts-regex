import { Tokenize } from '../src/tokenizer';
import { checkType } from './testUtils';

describe('tokenizer', () => {
  it('tokenizes literals', () => {
    checkType<['a', 'b', 'c'], Tokenize<'abc'>>();
    checkType<['a'], Tokenize<'a'>>();
    checkType<[], Tokenize<''>>();
    checkType<
      string[],
      Tokenize<'cljkvth5kl34jnvhtkejrhgvnjkljyt45hkvtv5hj234jkntgnkj24hg5ntjkfghc5j234lgerthrtwb hrt '>
    >();
  });

  it('tokenizes escape sequences', () => {
    checkType<['\\\\', '\\.'], Tokenize<'\\\\\\.'>>();
    checkType<['a', 'b', '\\\\', '\\0'], Tokenize<'ab\\\\\\0'>>();
    checkType<['a', 'b', '\\x'], Tokenize<'ab\\x'>>();
    checkType<['a', 'b', '\\x3f'], Tokenize<'ab\\x3f'>>();
    checkType<['a', 'b', '\\x4', 'g'], Tokenize<'ab\\x4g'>>();
    checkType<['a', 'b', '\\xff', 'f', 'f'], Tokenize<'ab\\xffff'>>();

    checkType<['a', 'b', '\\u12f2', 'g', '4'], Tokenize<'ab\\u12f2g4'>>();
    checkType<['a', 'b', '\\u12', 'g', '2', 'g', '4'], Tokenize<'ab\\u12g2g4'>>();
    checkType<['a', 'b', '\\u12'], Tokenize<'ab\\u12'>>();
    checkType<['a', 'b', '\\u', '\\u'], Tokenize<'ab\\u\\u'>>();

    checkType<['a', 'b', '1', '2', '\\345', '6', '7'], Tokenize<'ab12\\34567'>>();
    checkType<['a', 'b', '1', '2', '\\385'], Tokenize<'ab12\\385'>>();
    checkType<['a', 'b', '1', '2', '\\385'], Tokenize<'ab12\\385'>>();
  });

  it('tokenizes character groups', () => {
    checkType<['[', 'c', '[', '^', ']'], Tokenize<'[c[^]'>>();
    checkType<['[^', 'c', '[', '^', ']'], Tokenize<'[^c[^]'>>();
    checkType<['a', 'b', '[', 'c', '^', ']'], Tokenize<'ab[c^]'>>();
    checkType<['a', 'b', '[^', 'c', ']'], Tokenize<'ab[^c]'>>();
    checkType<['[', '\\123', ']'], Tokenize<'[\\123]'>>();
    checkType<['[', '(', '?', ':', ')', ']'], Tokenize<'[(?:)]'>>();
    checkType<['[', '\\1', '(', '?', ':', ')', ']'], Tokenize<'[\\1(?:)]'>>();
    checkType<['[', '\\1', '9', '3', ']'], Tokenize<'[\\193]'>>();
    checkType<['[', '\\k', '<', 'n', 'a', 'm', 'e', '>', ']'], Tokenize<'[\\k<name>]'>>();
  });

  it('tokenizes named capture groups', () => {
    checkType<['\\k<', '324f', '>', '(?<', 'name', '>', ' ', ')'], Tokenize<'\\k<324f>(?<name> )'>>();
    checkType<['\\k<', '324f', '>', '(?<', 'na()me', '>', ' ', ')'], Tokenize<'\\k<324f>(?<na()me> )'>>();
    checkType<['\\k<', '324f', '>', '(?<', 'n', 'a', 'm', 'e', ' ', ')'], Tokenize<'\\k<324f>(?<name )'>>();
    checkType<['\\k<', '324f', '>', '(?<', '', '>', ' ', ')'], Tokenize<'\\k<324f>(?<> )'>>();
  });

  it('tokenizes quantifiers', () => {
    checkType<['f', 'o', 'o', '?', 'b', 'a', 'r', '+', 'b', 'a', 'z', '*', '?'], Tokenize<'foo?bar+baz*?'>>();
    checkType<['f', 'o', 'o', '{', '34', ',', '56', '}'], Tokenize<'foo{34,56}'>>();
    checkType<['f', 'o', 'o', '{', '3', ',', '54562356', '}'], Tokenize<'foo{3,54562356}'>>();
    checkType<
      ['f', 'o', 'o', '{', '3', ',', ' ', '5', '4', '5', '6', '2', '3', '5', '6', '}'],
      Tokenize<'foo{3, 54562356}'>
    >();
    checkType<['f', 'o', 'o', '{', '}'], Tokenize<'foo{}'>>();
    checkType<['f', 'o', 'o', '{', '3', '}'], Tokenize<'foo{3}'>>();
    checkType<['f', 'o', 'o', '{', '33452346', '}'], Tokenize<'foo{33452346}'>>();
    checkType<['f', 'o', 'o', '{', '3', '3', '4', '5', '2', '3', ' ', '4', '6', '}'], Tokenize<'foo{334523 46}'>>();
  });

  it('tokenizes groups', () => {
    checkType<['(?:', 't', 'e', 's', 't', ')'], Tokenize<'(?:test)'>>();
    checkType<['(?<=', 't', 'e', 's', 't', ')'], Tokenize<'(?<=test)'>>();
    checkType<
      ['(?:', '(?<=', '[', '(', '?', ':', ')', ']', ')', ')', '{', '3', ',', '4', '}', '?'],
      Tokenize<'(?:(?<=[(?:)])){3,4}?'>
    >();
    checkType<['(', '?', 't', 'e', 's', 't', ')'], Tokenize<'(?test)'>>();
  });
});
