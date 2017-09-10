/**
 * Hover 1 meter in the air. Requires the Flow deck!
 */

const { Crazyradio, utils } = require('../dist/index');

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

		// What to do if we exit the program via Ctrl + c
		process.on('SIGINT', async () => {
			await drone.commander.stopSetpoint();
			process.exit();
		});

		const toc = await drone.parameters.getTOC();
		const resetKalman = toc.getItem('kalman', 'resetEstimation');

		console.log('******************************');
		console.log('Resetting Position Estimation...');
		console.log('******************************');

		drone.parameters.set(resetKalman, '1');
		await utils.wait(100);
		drone.parameters.set(resetKalman, '0');
		await utils.wait(2000);

		console.log('******************************');
		console.log('Done! All clear for takeoff.');
		console.log('******************************');

		await drone.commander.hoverSetpoint({
			zDistance: 0.25
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
