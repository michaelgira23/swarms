/**
 * Getting parameter data of the Crazyflie on the fly via console input
 */

const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

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

		drone.on('error', err => {
			console.log('Drone error!', err);
		});

		const toc = await drone.parameters.getTOC();

		console.log('******************************');
		console.log('To get or set a parameter, type one of the following into the console (after the colon):');
		console.log('GET PARAMETER: <group>.<name>');
		console.log('SET PARAMETER: <group>.<name> <new value>');
		console.log('******************************');

		rl.on('line', async input => {
			const args = input.split(' ');
			const fullname = args[0];
			const newValue = args[1];

			const [group, name] = fullname.split('.');

			if (!group || !name) {
				console.log(`Please enter full name of parameter (group.name)`);
				return;
			}

			const item = toc.getItem(group, name);

			if (!item) {
				console.log(`There is no parameter with group "${group}" and name "${name}"!`);
				return;
			}

			try {
				const start = new Date();
				if (!newValue) {
					// Get parameter
					const value = await drone.parameters.get(item);
					console.log(`Parameter ${group}.${name} is type "${item.type}" and value "${value}"\n(Got in ${Date.now() - start.getTime()} milliseconds)`);
				} else {
					// Set parameter
					const value = await drone.parameters.set(item, newValue);
					console.log(`Parameter ${group}.${name} is type "${item.type}" and set to value "${value}"\n(Set in ${Date.now() - start.getTime()} milliseconds)`);
				}
			} catch (err) {
				console.log('Get/Set Error!', err);
			}
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
