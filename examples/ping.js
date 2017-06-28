/**
 * Ping a Crazyflie
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

		if (drones.length < 1) {
			throw 'Could not find any drones!';
		}

		await radio.connect(drones[0]);
		setInterval(async () => {
			await radio.ping();
		}, 100);
	} catch (err) {
		console.log('Uh oh!', err);
	}
}
