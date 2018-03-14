/**
 * This module should be served up by the HTTP server that lives inside the
 * Electron application. It should be consumed by the inspected application as a
 * `<script>` tag.
 *
 * By importing the common client module, a Client instance is
 * created at `window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__`. An event listener is
 * attached which relays emitted messages over a WebSocket connection.
 *
 * The `%PORT%` and `%PID%` placeholders should be replaced with the port number
 * that WebSocket server is running on and Process ID of the main Electron
 * process. This replacement should be performed by the Electron HTTP server at
 * response-time.
 */
import { install, Message, DependencyTraceMessage, DependencyTraceResultMessage } from '../common/client';

const client = install();
const clientId = 'Electron:%PID%';
client.createQueue(clientId);

const socket = new WebSocket('ws://localhost:%PORT%');

socket.onopen = () => {
  client.subscribe(clientId, msg => {
    socket.send(JSON.stringify(msg));
  });
}

socket.onclose = () => {
  client.unsubscribe(clientId);
}

socket.onmessage = (ev) => {
  const payload: Message = JSON.parse(ev.data);

  if ((payload as DependencyTraceMessage).type === 'dependencyTrace') {
    return socket.send(JSON.stringify({
      source: 'CasiumDevToolsClient',
      type: 'dependencyTraceResult',
      result: client.dependencyTrace((payload as DependencyTraceMessage).messages)
    } as DependencyTraceResultMessage));
  }
}
