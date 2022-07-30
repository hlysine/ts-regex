import { Tokenize } from '../src/index';
import { checkType } from './testUtils';

describe('tokenizer', () => {
  it('tokenizes correctly', () => {
    checkType<['a', 'b', 'c'], Tokenize<'abc'>>();

    checkType<['\\\\', '\\.'], Tokenize<'\\\\\\.'>>();
    checkType<['a', 'b', '\\\\', '\\0'], Tokenize<'ab\\\\\\0'>>();
    checkType<['a', 'b', '\\x'], Tokenize<'ab\\x'>>();
    checkType<['a', 'b', '\\x3f'], Tokenize<'ab\\x3f'>>();
    checkType<['a', 'b', '\\x4', 'g'], Tokenize<'ab\\x4g'>>();
    checkType<['a', 'b', '\\xff', 'f', 'f'], Tokenize<'ab\\xffff'>>();

    checkType<['a', 'b', '\\u12f2', 'g', '4'], Tokenize<'ab\\u12f2g4'>>();

    checkType<['a', 'b', '1', '2', '\\345', '6', '7'], Tokenize<'ab12\\34567'>>();
    checkType<['a', 'b', '1', '2', '\\385'], Tokenize<'ab12\\385'>>();
    checkType<['a', 'b', '1', '2', '\\385'], Tokenize<'ab12\\385'>>();

    checkType<['[', 'c', '[', '^', ']'], Tokenize<'[c[^]'>>();
    checkType<['[^', 'c', '[', '^', ']'], Tokenize<'[^c[^]'>>();
    checkType<['a', 'b', '[', 'c', '^', ']'], Tokenize<'ab[c^]'>>();
    checkType<['a', 'b', '[^', 'c', ']'], Tokenize<'ab[^c]'>>();
    checkType<
      string[],
      Tokenize<'cljkvth5kl34jnvhtkejrhgvnjkljyt45hkvtv5hj234jkntgnkj24hg5ntjkfghc5j234lgerthrtwb hrt '>
    >();
    checkType<['\\k<', '324f', '>', '(?<', 'name', '>', ' ', ')'], Tokenize<'\\k<324f>(?<name> )'>>();
  });
});
