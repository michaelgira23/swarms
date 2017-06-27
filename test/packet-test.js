const { Packet } = require('../dist/packet');

const packet = new Packet();
packet.port = 3;
console.log('Export', packet.export());
console.log('toString', packet.exportHexCodes().join(' '));
