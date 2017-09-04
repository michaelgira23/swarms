/**
 * Autonomous flight with the Flow deck
 * Implementation of (https://github.com/bitcraze/crazyflie-lib-python/blob/master/examples/flowsequenceSync.py)
 */

const { Crazyradio, utils } = require('../dist/index');
// How high drone should be (in meters)
const hoverDistance = 0.4;
// How fast drone should move (in m/s)
const speed = 0.5;

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
		console.log('Resetting Position Estimation...')
		console.log('******************************');

		drone.parameters.set(resetKalman, '1');
		await utils.wait(100);
		drone.parameters.set(resetKalman, '0');
		await utils.wait(2000);

		console.log('******************************');
		console.log('Done! All clear for takeoff.')
		console.log('******************************');

		for (let i = 0; i <= 1; i += 0.1) {
			await drone.commander.hoverSetpoint({
				zDistance: (i / 1) * hoverDistance
			});
			await utils.wait(100);
		}
		await utils.wait(2000);


		await drone.commander.hoverSetpoint({
			velocityX: speed,
			yawRate: 36 * 2
		});
		await utils.wait(5000);


		await drone.commander.hoverSetpoint({
			velocityX: speed,
			yawRate: -36 * 2
		});
		await utils.wait(5000);

		await drone.commander.hoverSetpoint({
			velocityX: 0,
			yawRate: 0
		});
		await utils.wait(2000);

		for (let i = 0; i <= 1; i += 0.1) {
			await drone.commander.hoverSetpoint({
				zDistance: hoverDistance - ((i / 1) * hoverDistance)
			});
			await utils.wait(100);
		}

		await drone.commander.stopSetpoint();

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
