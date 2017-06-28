const { Packet } = require('../dist/packet');

const packet = new Packet();
packet.port = 15;
// packet.write(0x01);
packet.writeType('int8', 0x01);

console.log('Export', packet.export());
console.log('toString', packet.exportHexCodes().join(' '));
