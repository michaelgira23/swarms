/**
 * @file Random stuff used throughout the project
 */

import { EventEmitter } from 'events';
import * as _ from 'lodash';

/**
 * Convert number to hex
 */

export function toHex(decimal: number, evenLength = false, xPrefix = false) {
	let hex = decimal.toString(16);

	if (evenLength && hex.length % 2 !== 0) {
		hex = '0' + hex;
	}

	if (xPrefix) {
		hex = '0x' + hex;
	}

	return hex;
}

/**
 * Convert number to binary
 */

export function toBinary(decimal: number, lengthMultipleOfFour = false, gapEveryByte = false, minLength = 0) {
	let binary = _.padStart(decimal.toString(2), minLength, '0');

	if (lengthMultipleOfFour && binary.length % 4 !== 0) {
		binary = _.padStart(binary, Math.ceil(binary.length / 4) * 4, '0');
	}

	if (gapEveryByte) {
		binary = binary.match(/.{1,4}/g).join(' ');
	}

	return binary;
}

/**
 * Rounds a number to a certain decimal place.
 * Precision 0 by default.
 */

export function round(num: number, precision = 0) {
	return _.round(num, precision);
}

/**
 * Returns a promise that resolves in n milliseconds
 */

export function wait(milliseconds: number) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, milliseconds);
	});
}

/**
 * Wait until event is emitted
 * @TODO Add timeout as well if event is never emitted
 */

export function waitUntilEvent<T>(emitter: EventEmitter, eventName: string) {
	return () => new Promise<T>((resolve, reject) => {
		emitter.once(eventName, (data: T) => {
			resolve(data);
		});
	});
}
