export function checkType<T1, _T2 extends T1>(): void;
export function checkType<T>(_: T): void;
export function checkType<T1>(_?: T1): void {}

checkType<''>('');
checkType<'', ''>();

checkType<'a'>('a');
checkType<'a', 'a'>();

// @ts-expect-error - wrong type
checkType<'a'>('b');
// @ts-expect-error - wrong type
checkType<'a', 'b'>();
