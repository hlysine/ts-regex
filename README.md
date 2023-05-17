<h1 align="center">ts-regex</h1>

<div align="center">

[![CI](https://github.com/hlysine/ts-regex/actions/workflows/main.yml/badge.svg)](https://github.com/hlysine/ts-regex/actions/workflows/main.yml)
[![Coverage Status](https://coveralls.io/repos/github/hlysine/ts-regex/badge.svg?branch=main)](https://coveralls.io/github/hlysine/ts-regex?branch=main)
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/npm/v/@henry-yslin/ts-regex)](https://www.npmjs.com/package/@henry-yslin/ts-regex)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@henry-yslin/ts-regex)](https://www.npmjs.com/package/@henry-yslin/ts-regex)
[![Dependency Count](https://img.shields.io/badge/dynamic/json?url=https://api.npmutil.com/package/@henry-yslin/ts-regex&label=dependencies&query=$.dependencies.count)](https://www.npmjs.com/package/@henry-yslin/ts-regex)

</div>

<p align="center">
Strongly typed RegExp wrapper.
</p>

## Installation

Install ts-regex with your preferred package manager, and then import it with CommonJS or ES Modules syntax:

```bash
npm install @henry-yslin/ts-regex

yarn add @henry-yslin/ts-regex
```

```js
import { regex } from '@henry-yslin/ts-regex';

const { regex } = require('@henry-yslin/ts-regex');
```

## Usage

Simply use the provided `regex` function to create `RegExp` objects. You will get strongly-typed match results and
compile-time regex syntax check for free!

```ts
import { regex } from '@henry-yslin/ts-regex';

const nameRegex = regex('(?<first>[a-zA-Z_$])[a-zA-Z0-9_$]*');

const result = nameRegex.exec('foo');

// @ts-expect-error Property 'second' does not exist on type '{ first: string; }'.
console.log(result?.groups.second);
```

```ts
// @ts-expect-error '\\2' is being parsed as an octal character escape sequence, which is banned because it is easily confused with a back-reference.
const backRefRegex = regex('(.+)\\2');
```

```ts
// @ts-expect-error '\\u134' is not a valid unicode escape sequence and is being parsed literally. Do not escape the 'u' character when not in a unicode escape sequence.
const unicodeRegex = regex('\\u134');
```

```ts
const nameRegex = regex('www\\.(?<name>.+)\\.com');
const result = 'https://www.google.com'.match(nameRegex);

console.log(result?.groups.name); // strongly-typed match result

// @ts-expect-error the named capture group "domain" does not exist
console.log(result?.groups.domain);
```
