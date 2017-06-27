const _ = require('lodash');
const bytes = process.argv.splice(2).map(x => parseInt(x));

const indexLength = (bytes.length - 1).toString().length + 1;

for (let i = 0; i < bytes.length; i++) {
	const byte = bytes[i];
	const toHex = `0x${_.padStart(byte.toString(16), 2, 0)}`;
	// Convert to binary and add space between bytes
	let toBinary = _.padStart(byte.toString(2), 8, 0)
		.split('');
	toBinary.splice(4, 0, ' ');
	toBinary = toBinary.join('');

	console.log(`Byte ${_.padEnd(i, indexLength)}: ${toHex} | ${toBinary}`);
}

const headerByte = bytes[2];
console.log();
console.log(`Port: ${(headerByte & 0xF0) >> 4}`);
console.log(`Channel: ${headerByte & 0x03}`);
console.log();
