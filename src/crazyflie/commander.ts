import { Crazyflie } from '.';
import { PORTS } from '../constants';
import { Packet } from '../packet';

/**
 * Class for dealing with the 'commander' port
 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:commander)
 */

export class Commander {

	currentSetpoint: Setpoint = {
		roll: 0,
		yaw: 0,
		pitch: 0,
		thrust: 0
	};

	constructor(private crazyflie: Crazyflie) {

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
