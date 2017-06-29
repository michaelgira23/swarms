/**
 * Small debugging script for inspecting different parts of a Crazyflie packet
 * Insert bytes as arguments (Ex. `$ node packet-inspector.js 0xaa 0xaa ...`)
 */

/**
 * Example input and output:
 *
 * $ node test/packet-inspector.js 0xaa 0xaa 0xf0 0x01 0xf1
 * Byte 0 : 0xaa | 1010 1010
 * Byte 1 : 0xaa | 1010 1010
 * Byte 2 : 0xf0 | 1111 0000
 * Byte 3 : 0x01 | 0000 0001
 * Byte 4 : 0xf1 | 1111 0001
 *
 * Port: 15
 * Channel: 0
 *
 */

const { toHex, toBinary } = require('../dist/index').utils;
const _ = require('lodash');

const bytes = process.argv.splice(2).map(x => parseInt(x, 16));

// Find the last byte number length so we can align all the colons
const indexLength = (bytes.length - 1).toString().length + 1;

for (let i = 0; i < bytes.length; i++) {
	const byte = bytes[i];
	console.log(`Byte ${_.padEnd(i, indexLength)}: ${toHex(byte, true, true)} | ${toBinary(byte, true, true, 8)}`);
}

const headerByte = bytes[2];
console.log();
console.log(`Port: ${(headerByte & 0xF0) >> 4}`);
console.log(`Channel: ${headerByte & 0x03}`);
console.log();
