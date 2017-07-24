# Tutorials: Flying

To get the drone flying, use the `commander` subsystem of the Crazyflie. It exposes a `setpoint()` method which can be passed in an object to control its `roll`, `yaw`, `pitch`, and `thrust` like so:

```javascript
await drone.commander.setpoint({
	roll: 0,
	yaw: 0,
	pitch: 0
	thrust: 32500,
});
```

## Properties

If any of the four properties are not specified, it defaults to the last previous value. Each property has an initial value of `0`.

### Thrust

If the propellers aren't moving even after sending a setpoint, make sure the thrust is big enough. [Values should be between `10,001` and `60,000`](https://forum.bitcraze.io/viewtopic.php?t=442).

## Full Example

A full working example is located in [`/examples/move-propellers.js`](https://github.com/michaelgira23/swarms/blob/master/examples/move-propellers.js).
