/**
 * Simple little script for finding nearby Crazyflies
 */

const swarms = require('../dist/index');

// Because you can only use `await` within an async function...
main();
async function main() {
	const radio = new swarms.Crazyradio();
	try {
		await radio.init();
	} catch (err) {
		console.log('There was a problem setting up the Crazyradio!', err);
	}
}
