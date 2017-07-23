/**
 * Simple little script for finding nearby Crazyflies
 */

const { Crazyradio } = require('../dist/index');

// Because you can only use `await` within an async function...
main();
async function main() {

	const radio = new Crazyradio();

	try {
		await radio.init();
		const drones = await radio.findDrones();
		console.log(`Nearby drones: ${drones}`);
	} catch (err) {
		console.log('Uh oh!', err);
	}
	await radio.close();
}
