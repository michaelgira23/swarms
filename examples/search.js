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
		const drones = await radio.findDrones();
		console.log(`Nearby drones: ${drones}`);
	} catch (err) {
		console.log('Uh oh!', err);
	}
	await radio.close();
}
