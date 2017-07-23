# swarms

The ultimate node.js client for controlling Bitcraze Crazyflie 2.0 drones

Warning: This projects is going under heavy active development!

## Motive

There were too many outdated and undocumented node.js libraries out there for programming Crazyflies. This package's goal is to fix that.

## Getting Started

### Prerequisites

#### Crazyflie

This package assumes you have the latest version of the Crazyflie firmware. [You can find instructions on the Bitcraze website on how to update your firmware.](https://www.bitcraze.io/getting-started-with-the-crazyflie-2-0/#latest-fw)

#### `libusb` Driver

This package's main dependency is `node-usb`. [Refer to its installation directions](https://github.com/tessel/node-usb#installation) for any help installing it.

##### Windows

[Look on the Bitcraze wiki for instructions on how to install the correct driver.](https://wiki.bitcraze.io/doc:crazyradio:index#drivers)

##### Linux

[Look at the `node-usb`'s README for directions to install the package.](https://github.com/tessel/node-usb#installation)

### Installation

```
$ npm install swarms
```

### Example Usage

The following script simply moves the drone's propellers. [More examples are located in the `/examples` directory.](https://github.com/michaelgira23/swarms/tree/master/examples)

```javascript
const { Crazyradio } = require('swarms');

// Because you can only use `await` within an async function...
main();
async function main() {

	const radio = new Crazyradio();

	try {

		await radio.init();
		radio.on('error', err => {
			console.log('Radio error!', err);
		});

		const drones = await radio.findDrones();
		console.log('Nearby drones: ' + drones);

		if (drones.length < 1) {
			throw 'Could not find any drones!';
		}

		const drone = await radio.connect(drones[0]);
		drone.on('error', err => {
			console.log('Drone error!', err);
		});

		await drone.commander.setpoint({
			roll  : 0,
			yaw   : 0,
			pitch : 0,
			thrust: 32500
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
```

### Troubleshooting

#### Windows

You may encounter an issue installing this package on Windows. [Follow procedure detailed here.](https://github.com/libusb/libusb/issues/144#issuecomment-269832528)

## Contributing

Encounter a bug? Have an idea for a new feature? [Open up an issue!](https://github.com/michaelgira23/swarms/issues/new)

PR's are also welcome! Just make sure you don't have any linting errors. You can check for linting errors by running:

```
$ npm run lint
```

## Development

This project uses TypeScript. To compile from source, run:

```
$ npm run ts
```

While modifying the source files, it may be useful to automatically compile. You can do that with the following:

```
$ npm run ts:watch
```

## Versioning

This project uses the [SemVer](http://semver.org/) notation for versioning.

## License

This project is under the MIT License.

## Acknowledgments

Special thanks to the following people, whose libraries were used as a reference:
- [Bitcraze team's `crazyflie-lib-python` library](https://github.com/bitcraze/crazyflie-lib-python)
- [C J Silverio's `aerogel` library](https://github.com/ceejbot/aerogel)
