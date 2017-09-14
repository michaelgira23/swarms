/**
 * Hover the drone at 1m, 1m, 1m (x, y, z) with the Loco Positioning System
 */

const { Crazyradio, utils } = require('../dist/index');

const hover = {
	x: 1,
	y: 1,
	z: 1,
	yaw: 0
};

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
			await drone.commander.setpoint({
				roll: 0,
				pitch: 0,
				yaw: 0,
				thrust: 0
			});
			process.exit();
		});

		const paramToc = await drone.parameters.getTOC();
		const resetKalman = await paramToc.getItem('kalman', 'resetEstimation');

		console.log('******************************');
		console.log('Resetting Position Estimation...');
		console.log('******************************');

		await drone.parameters.set(resetKalman, '1');
		await utils.wait(100);
		await drone.parameters.set(resetKalman, '0');
		await utils.wait(2000);

		console.log('******************************');
		console.log('Waiting for Loco Positioning System to stablize...');
		console.log('******************************');

		await new Promise(async (resolve, reject) => {

			// How close last 10 positions must be considered stable (in meters)
			const threshold = 0.001;

			// Last 10 x, y, z coordinate readings
			const xHistory = Array(10).fill(1000);
			const yHistory = Array(10).fill(1000);
			const zHistory = Array(10).fill(1000);

			// Poll coordinates every 500ms
			const logToc = await drone.logging.getTOC();
			await drone.logging.start([
				logToc.getItem('kalman', 'varPX'),
				logToc.getItem('kalman', 'varPY'),
				logToc.getItem('kalman', 'varPZ')
			], 500);

			const handler = data => {
				console.log('kalman', data);

				xHistory.shift();
				xHistory.push(data.varPX);
				xMin = Math.min(...xHistory);
				xMax = Math.max(...xHistory);

				yHistory.shift();
				yHistory.push(data.varPY);
				yMin = Math.min(...yHistory);
				yMax = Math.max(...yHistory);

				zHistory.shift();
				zHistory.push(data.varPZ);
				zMin = Math.min(...zHistory);
				zMax = Math.max(...zHistory);

				if (xMax - xMin < threshold
					&& yMax - yMin < threshold
					&& zMax - zMin < threshold) {

					// All done! Continue
					drone.logging.data.removeListener('kalman', handler);
					resolve();
				}
			};

			drone.logging.data.on('kalman', handler);

		});

		// Set drone to 'set position' mode
		await drone.parameters.set(paramToc.getItem('flightmode', 'posSet'), '1');

		await drone.commander.setpoint({
			roll: hover.y,
			pitch: hover.x,
			yaw: hover.yaw,
			thrust: Math.floor(hover.z * 1000)
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
