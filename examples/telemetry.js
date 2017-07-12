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

		const telemetryStart = new Date();
		// await drone.logging.getTOC();
		await drone.logging.clearCache();

		drone.on('toc item', item => {
			console.log('******************************');
			console.log(`Got TOC Item ${item.id}! After ${(Date.now() - telemetryStart) / 1000}s`);
			console.log(`TOC item ${item.id + 1} / ${drone.logging.tocLength} (${(item.id + 1) / drone.logging.tocLength}%)`);
			console.log('******************************');
		});

		drone.on('toc ready', () => {
			console.log('******************************');
			console.log(`Telemetry ready! After ${(Date.now() - telemetryStart) / 1000}s`);
			console.log(`TOC is length ${drone.logging.tocLength}`);
			console.log(drone.logging.toc);
			console.log('******************************');
		});

		drone.on('error', err => {
			console.log('Drone error!', err);
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
