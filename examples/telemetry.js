/**
 * Getting telemetry data of the Crazyflie
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

		console.log('******************************');
		console.log('Retrieving Crazyflie Table of Contents');
		console.log('This could take up to ~30 seconds...');
		console.log('******************************');

		drone.on('toc item', item => {
			const time = (Date.now() - telemetryStart) / 1000;
			const nthItem = drone.logging.toc.items.length;
			const percentage = swarms.utils.round((nthItem / drone.logging.tocLength) * 100, 2);
			console.log('******************************');
			console.log(`Got TOC Item ID ${item.id}! After ${time}s`);
			console.log(`TOC item ${nthItem} / ${drone.logging.tocLength} (${percentage}%)`);
			console.log('******************************');
		});

		const telemetryStart = new Date();
		const toc = await drone.logging.getTOC();

		console.log('******************************');
		console.log(`Telemetry ready! After ${(Date.now() - telemetryStart) / 1000}s`);
		console.log(`TOC is length ${drone.logging.tocLength}`);
		console.log(drone.logging.toc);
		console.log('******************************');

		// Invoke getting of gyroscope data
		// await drone.logging.startLogging([
		// 	toc.getItem('gyro', 'x'),
		// 	toc.getItem('gyro', 'y'),
		// 	toc.getItem('gyro', 'z')
		// ]);

		// console.log('******************************');
		// console.log('Logging finished!');
		// console.log('******************************');

		drone.on('error', err => {
			console.log('Drone error!', err);
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
