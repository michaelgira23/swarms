# Contributing

Hello, and thank you for being a part of the Swarms project! Your voice matters and helps shape the direction of this project.

## How to Make an Issue

Issues should be created if you see a bug or have a feature request.

### Reporting a Problem

If you have any troubles installing the library or have an issue with the package itself, take the following steps (if applicable to your problem):

1. Check out the [Troubleshooting Guide](https://github.com/michaelgira23/swarms/blob/master/docs/troubleshooting.md#steps-to-take) for trying to fix the problem.
2. Try to find the scope of the issue. Is it with the `swarms` package itself? `node-usb`? Something else?
3. [Create an issue](https://github.com/michaelgira23/swarms/issues/new) make sure to include the following:
	- Descriptive title
	- Detailed description of bug or problem
	- Current setup when applicable (OS, `swarms` version, Crazyflie and Crazyradio firmware version, etc...)
	- Detailed instructions on how to replicate the issue

### Suggesting a Feature

Similarly to reporting a problem, [create an issue](https://github.com/michaelgira23/swarms/issues/new) with a detailed title and body. This can include adding functionality to the library, enhancing documentation, and more.

## Contributing Your Own Code

Want to help out? Think you can fix a problem yourself? Well go ahead! [Fork the repository](https://help.github.com/articles/fork-a-repo/) and create a branch with a descriptive name. After making changes, double check all linting and tests pass, and [create a pull request](https://help.github.com/articles/creating-a-pull-request/)!

### Development

#### Compiling

This project uses TypeScript. To compile from source, run:

```
$ npm run ts
```

During development, it may be useful to automagically compile on any file changes. Do this by running:

```
$ npm run ts:watch
```

#### Linting

Make sure your code is formatted correctly by running:

```
$ npm run lint
```

#### Testing

Make sure your code passes linting and unit tests by using:

```
$ npm test
```

#### Generating Documentation

To automatically generate documentation with `TypeDoc`, run:

```
$ npm run docs
```

This will generate an `/api-reference` folder with a static site.
