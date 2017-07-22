/**
 * Connect to a Crazyflie
 */

const swarms = require('../dist/index');

// Because you can only use `await` within an async function...
main();
async function main() {
	const radio = new swarms.Crazyradio();
	try {
		await radio.init();

		radio.on('console line', console.log);

		const drones = await radio.findDrones();
		console.log(`Nearby drones: ${drones}`);

		if (drones.length < 1) {
			throw 'Could not find any drones!';
		}

		const drone = await radio.connect(drones[0]);

		setTimeout(async () => {
			console.log('Disconnect!');
			await radio.disconnect();
			await radio.close();
		}, 3000);

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
