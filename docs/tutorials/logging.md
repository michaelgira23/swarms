# Tutorials: Logging

After getting the Crazyflie in the air, it may also be useful to read sensor data. You can do this by using the `logging` subsystem.

## Initialization

Before reading any sensor data, it is **required** to retrieve the drone's logging Table of Contents (TOC). The TOC contains a list of all the drone's available properties to read from. You can retrieve its logging TOC like so:

```javascript
const toc = await drone.logging.getTOC();
```

The TOC object is comprised of numerous "TOC items". Each item in represents one sensor value you can stream off the Crazyflie. It contains an `id`, `group`, `name`, and `type` property. After fetching the logging TOC once, a cached version should be available in the `cacheDir` value of the Crazyflie options (defaults to location of swarms module + `/cache`).

It makes most sense to query the TOC items by their group and name. You can use the `TOC.getItem()` method. For example, to get the three different axis (`x`, `y`, and `z`) of the gyroscope, you can use the following:

```javascript
const gyroX = toc.getItem('gyro', 'x');
const gyroY = toc.getItem('gyro', 'y');
const gyroZ = toc.getItem('gyro', 'z');
```

## Starting the Logging

Once the TOC is retrieved, you can start streaming the values back to the computer by using the `logging.start()` method, and supplying an array of TOC items. You can optionally provide a second argument on how often (in milliseconds) you want the values updated. Defaults to every 100ms. This is how to start logging the gyroscope data every second.

```javascript
await drone.logging.start([
	toc.getItem('gyro', 'x'),
	toc.getItem('gyro', 'y'),
	toc.getItem('gyro', 'z')
], 1000);
```

You can call `logging.start()` multiple times.

## Handling the Data

Once you call `logging.start()`, this data can be accessed via the `logging.data` EventEmitter. There are three ways you can access the data:

### Global `*` event

This is useful if you're interested in any and all data coming from the drone. The object emitted with the event has the following format:

```javascript
{
	group: {
		name: value
	}
}
```

For example, if you were logging both gyroscope and accelerometer data:

```javascript
drone.logging.data.on('*', data => {
	console.log(data);
	// {
	// 	acc: { x: 123, y: 123, z: 123 },
	// 	gyro: { x: 123, y: 123, z: 123 }
	// }
});
```

### `Group` event

This is useful if you're interested in all the data from a specific logging group/sensor. The object emitted with the event has the following format:

```javascript
{
	name: value
}
```

For example, if you were logging the gyroscope data:

```javascript
drone.logging.data.on('gyro', data => {
	console.log(data);
	// {
	// 	x: 123,
	// 	y: 123,
	// 	z: 123
	// }
});
```

### Full name event (`group.name`)

This is useful if you're interested only in a specific sensor value. Only its number value is emitted with the event.

For example, if you were logging the x-axis gyroscope data:

```javascript
drone.logging.data.on('gyro.x', data => {
	console.log(data);
	// 123
});
```

## Putting It All Together

Combining everything covered in the past few sections, this is what the code should look like in the end to log gyroscope data:

```javascript
const toc = await drone.logging.getTOC();

await drone.logging.start([
	toc.getItem('gyro', 'x'),
	toc.getItem('gyro', 'y'),
	toc.getItem('gyro', 'z')
]); // Second argument is optional, defaults to every 100ms

/**
 * These are the three ways you can access the data
 */

// Global `*` event
drone.logging.data.on('*', data => {
	console.log(data);
	// {
	// 	acc: { x: 123, y: 123, z: 123 },
	// 	gyro: { x: 123, y: 123, z: 123 }
	// }
});

// `Group` event
drone.logging.data.on('gyro', data => {
	console.log(data);
	// {
	// 	x: 123,
	// 	y: 123,
	// 	z: 123
	// }
});

// Specific `group.name` events
drone.logging.data.on('gyro.x', data => {
	console.log(data);
	// 123
});

drone.logging.data.on('gyro.y', data => {
	console.log(data);
	// 123
});

drone.logging.data.on('gyro.z', data => {
	console.log(data);
	// 123
});

```

## Full Example

A full working example is located in [`/examples/telemetry.js`](https://github.com/michaelgira23/swarms/blob/master/examples/telemetry.js).
