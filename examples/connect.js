/**
 * Connect to a Crazyflie
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

		setTimeout(async () => {
			console.log('Disconnect!');
			await radio.close();
		}, 3000);

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
