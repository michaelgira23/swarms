import { Crazyflie } from '.';
import { PORTS } from '../constants';
import { Packet } from '../packet';

export class Commander {

	// Set values initially at 0 or else it won't work
	private currentSetpoint: Setpoint = {
		roll: 0,
		yaw: 0,
		pitch: 0,
		thrust: 0
	};

	private setpointInterval: NodeJS.Timer;

	/**
	 * Class for dealing with the 'commander' port
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:commander)
	 */

	constructor(private crazyflie: Crazyflie) {
		// Stop setpoint interval upon disconnect
		this.crazyflie.radio.on('disconnect', () => {
			this.clearSetpointInterval();
		});
	}

	/**
	 * We need to update the Crazyflie's position every so often otherwise it will stop after a few seconds
	 */

	startSetpointInterval() {
		this.clearSetpointInterval();
		this.setpointInterval = setInterval(() => {
			this.setpoint();
		}, 100);
	}

	/**
	 * Clear the setpoint interval
	 */

	clearSetpointInterval() {
		if (this.setpointInterval) {
			clearInterval(this.setpointInterval);
		}
	}

	/**
	 * Set the setpoint point
	 */

	setpoint(setpoint?: Setpoint) {

		// Default to previous values
		const target = Object.assign({}, this.currentSetpoint, setpoint);

		// Set thrust limits
		if (target.thrust < 0) {
			target.thrust = 0;
		}
		if (target.thrust > 0xFFFF) {
			target.thrust = 0xFFFF;
		}

		this.currentSetpoint = target;

		const packet = new Packet();
		packet.port = PORTS.COMMANDER;

		packet
			.write('float', target.roll)
			.write('float', -target.pitch)
			.write('float', target.yaw)
			.write('uInt16', target.thrust);

		return this.crazyflie.radio.sendPacket(packet);
	}

}

export interface Setpoint {
	roll?: number;
	pitch?: number;
	yaw?: number;
	thrust?: number;
}
