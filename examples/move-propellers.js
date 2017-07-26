/**
 * Move the propellers
 */

const { Crazyradio } = require('../dist/index');

// Because you can only use `await` within an async function...
main();
async function main() {

	const radio = new Crazyradio();

	try {

		await radio.init();

		radio.on('console line', console.log);
		radio.on('error', err => {
			console.log('Radio error!', err);
		});

		const drones = await radio.findDrones();
		console.log(`Nearby drones: ${drones}`);

		if (drones.length < 1) {
			throw 'Could not find any drones!';
		}

		const drone = await radio.connect(drones[0]);

		await drone.commander.setpoint({
			thrust: 10001
		});

		// What to do if we exit the program via Ctrl + c
		process.on('SIGINT', async () => {
			await drone.commander.setpoint({
				roll: 0,
				pitch: 0,
				yaw: 0,
				thrust: 0
			});
			process.exit();
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
