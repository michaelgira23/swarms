// Type definitions for ieee754 1.1
// Project: https://github.com/feross/ieee754
// Definitions by: Michael Gira <https://github.com/michaelgira23>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

export function read(buffer: Buffer, offset: number, isLe: boolean, mLen: number, nBytes: number): number;
export function write(buffer: Buffer, value: number, offset: number, isLe: boolean, mLen: number, nBytes: number): void;
