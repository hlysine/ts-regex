import { ParseFlags } from '../src/flags';
import { checkType } from './testUtils';

describe('flags', () => {
  it('parses flags', () => {
    checkType<
      {
        d: false;
        g: false;
        i: false;
        m: false;
        s: false;
        u: false;
        y: false;
        errors: ["Invalid flag 'a'", "Invalid flag 'b'", "Invalid flag 'c'"];
      },
      ParseFlags<'abc'>
    >();
    checkType<{ d: false; g: true; i: true; m: true; s: true; u: false; y: true; errors: [] }, ParseFlags<'gimys'>>();
    checkType<
      {
        u: false;
        d: false;
        g: true;
        i: true;
        m: false;
        s: false;
        y: false;
        errors: ["Duplicate flag 'g'"];
      },
      ParseFlags<'ggi'>
    >();
  });
});
