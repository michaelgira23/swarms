# Tutorials: Connecting to the Drone

The first step in this aerospace adventure is having a Crazyflie 2.0 and Crazyradio (Bluetooth Low Energy is on the roadmap). The next step is connecting to the drone. The `swarms` library exposes a `Crazyradio` class that represents one Crazyradio. **After creating a Crazyradio object, you must immediately call `radio.init()` to do some asynchronous initial setup.**

```javascript
const { Crazyradio } = require('swarms');

const radio = new Crazyradio();
await radio.init(); // Required!
```

## Scanning for Drones

Make sure both the Crazyradio is plugged into the computer and the Crazyflie is turned on. You can use the `radio.findDrones()` method to find any nearby drones. This will return an array of URI objects of any detected drones. Sometimes it takes a few scans for a drone to pick up!

```javascript
const drones = await radio.findDrones();
console.log(drones);
// [ radio://1/80/2M ]
```

### Setting the Data Rate

If you have a lot of wifi interference, you may want to to [switch to a higher bandwidth data rate such as `1M` or `2M`.](https://wiki.bitcraze.io/doc:crazyflie:client:pycfclient:index#firmware_configuration)

> A lower bandwidth has longer range but has higher chance of collision. When used inside sometimes it is better to use 1M or 2M as it decreases the risk of collision with WiFi.

A Crazyflie's data rate can be changed via the official Crazyflie client. To avoid the hassle of installing the client on your own machine, [the Bitcraze VM is available](https://wiki.bitcraze.io/projects:virtualmachine:index) with a pre-installed client and tooling.

## Connecting to a Drone URI

After scanning for nearby drones, you can pass one of the URI objects into the `Crazyradio.connect()` method to tune into the correct data rate and channel. This will also return a `Crazyflie` object used to control the actual Crazyflie itself. Usage of the Crazyflie object can be found in later tutorials.

```javascript
const drone = await radio.connect(drones[0]);
// Do whatever you want with the `drone` variable!
```

## Putting It All Together

Combining everything covered in this tutorial, this is what the code should look like to initialize the Crazyradio and connect to a Crazyflie.

```javascript
const { Crazyradio } = require('swarms');

const radio = new Crazyradio();
await radio.init();

const drones = await radio.findDrones();

if (drones.length < 1) {
	throw 'Could not find any drones!';
}

const drone = await radio.connect(drones[0]);
```

## Full Example

A full working example is located in [`/examples/connect.js`](https://github.com/michaelgira23/swarms/blob/master/examples/connect.js).
