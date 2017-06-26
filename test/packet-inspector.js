const _ = require('lodash');
const bytes = process.argv.splice(2);

const indexLength = (bytes.length - 1).toString().length + 1;

for (let i = 0; i < bytes.length; i++) {
	const byte = parseInt(bytes[i]);
	const toHex = `0x${_.padStart(byte.toString(16), 2, 0)}`;
	// Convert to binary and add space between bytes
	let toBinary = _.padStart(byte.toString(2), 8, 0)
		.split('');
	toBinary.splice(4, 0, ' ');
	toBinary = toBinary.join('');

	console.log(`Byte ${_.padEnd(i, indexLength)}: ${toHex} | ${toBinary}`);
}
