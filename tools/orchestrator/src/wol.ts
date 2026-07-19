import dgram from "node:dgram";

/**
 * Builds a Wake-on-LAN magic packet (102 bytes).
 * Validates MAC format (aa:bb:cc:dd:ee:ff or AA-BB-CC-DD-EE-FF).
 */
export function buildMagicPacket(mac: string): Uint8Array {
  const match = mac.match(/^([0-9a-fA-F]{2}[:\-]){5}([0-9a-fA-F]{2})$/);
  if (!match) {
    throw new Error(`Invalid MAC address format: ${mac}. Expected aa:bb:cc:dd:ee:ff or AA-BB-CC-DD-EE-FF`);
  }

  const bytes = mac.split(/[:\-]/).map((x) => parseInt(x, 16));
  const packet = new Uint8Array(102);

  // 6 bytes of 0xFF
  packet.fill(0xff, 0, 6);

  // 16 repetitions of the MAC address
  for (let i = 0; i < 16; i++) {
    packet.set(bytes, 6 + i * 6);
  }

  return packet;
}

/**
 * Sends a WoL magic packet to the specified MAC address.
 * If udpSend is provided in opts, it is used instead of the real UDP socket.
 */
export async function sendWol(mac: string, opts?: { udpSend?: (p: Uint8Array) => Promise<void> }): Promise<void> {
  const packet = buildMagicPacket(mac);

  if (opts?.udpSend) {
    await opts.udpSend(packet);
    return;
  }

  const broadcast = process.env.ORCH_WOL_BROADCAST || "255.255.255.255";
  const client = dgram.createSocket("udp4");
  return new Promise((resolve, reject) => {
    client.send(packet, 9, broadcast, (err) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
}
