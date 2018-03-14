import { Message } from '../common/client';

/**
 * A mapping of opened Ports, the name of the channel that messages on that Port
 * should be forwarded to, and a queue of pending messages (in case the
 * destination port does not exist yet).
 */
interface PortMapping {
  [source: string]: {
    dest: string;
    port?: browser.runtime.Port;
    queue: {}[];
  }
}

const PORT_MAPPING: PortMapping = {
  CasiumDevToolsContentScript: {
    dest: 'CasiumDevToolsPanel',
    queue: []
  },

  CasiumDevToolsPanel: {
    dest: 'CasiumDevToolsContentScript',
    queue: []
  }
};

/**
 * Sends a message to all connected ports
 */
const broadcast = (msg: Message) =>
  Object.keys(PORT_MAPPING).forEach(source => {
    try {
      (PORT_MAPPING[source].port as browser.runtime.Port).postMessage({
        source: 'CasiumDevToolsBackgroundScript',
        ...msg
      });
    } catch (e) { }
  })

/**
 * Ensures that all ports are connected
 */
const allReady = () =>
  Object.keys(PORT_MAPPING).reduce((prev, source) => prev && !!PORT_MAPPING[source].port, true);

/**
 * Configures a simple message relaying mechanism. Whenever the DevTools or
 * Content Script connects to the Background page, register the connecting port
 * in `PORT_MAPPING` and configure a message handler.
 *
 * Once this handler has been configured, any queued messages will be relayed
 * and the queue emptied.
 */
browser.runtime.onConnect.addListener(port => {
  if (!Object.keys(PORT_MAPPING).includes(port.name)) {
    console.log(`Port '${port.name}' ignored`);
    return;
  }

  console.log(`%cPort '${port.name}' connected`, 'font-weight: bold; color: #2eb82e;');
  Object.assign(PORT_MAPPING[port.name], { port });

  /**
   * Whenever a message is received on a port, lookup the destination port in
   * `PORT_MAPPING` and relay the received message to the destination port. If
   * the destination port does not exist (ie, it has not connected yet), then
   * queue the message instead.
   */
  const messageHandler = (message: any, sender: browser.runtime.Port) => {
    if (message.source === 'CasiumDevToolsBackgroundScript') {
      return;
    }

    console.log(`%cMessage FROM '${sender.name}'`, 'font-weight: bold; color: #e6b800;', message);

    if (!PORT_MAPPING[sender.name]) {
      throw new Error('No channel defined for sender');
    }

    const { dest } = PORT_MAPPING[sender.name];
    const { port: destPort, queue: destQueue } = PORT_MAPPING[dest];

    if (!destPort) {
      console.log(`%cMessage Not Relayed: Destination port '${destPort}' does not exist - message queued`, 'font-weight: bold; color: #cc2900;', message);
      destQueue.push(message);
      return;
    }

    console.log(`%cMessage Relayed TO '${dest}'`, 'font-weight: bold; color: #e6b800;', message);
    destPort.postMessage(message);
  }

  port.onMessage.addListener(messageHandler as any);

  /**
   * When a port is disconnected, ensure the message handler is cleaned up and
   * the entry is removed from `PORT_MAPPING`
   */
  port.onDisconnect.addListener(() => {
    console.log(`%cPort '${port.name}' disconnected, broadcasting 'disconnected' message`, 'font-weight: bold; color: #cc2900;');
    (port as any).onMessage.removeListener(messageHandler);
    broadcast({ type: 'disconnected' });
    delete PORT_MAPPING[port.name].port;
  })

  if (allReady()) {
    console.log(`%cAll ports connected, broadcasting 'connected' message`, 'font-weight: bold; color: #2eb82e;');
    broadcast({ type: 'connected' });
  }

  const { queue } = PORT_MAPPING[port.name];
  console.log(`%cRelaying ${queue.length} queued messages TO '${port.name}'`, 'font-weight: bold; color: #e6b800;');
  queue.forEach(msg => port.postMessage(msg));
  PORT_MAPPING[port.name].queue = [];
});
