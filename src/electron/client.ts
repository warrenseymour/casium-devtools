/**
 * This module should be served up by the HTTP server that lives inside the
 * Electron application. It should be consumed by the inspected application as a
 * `<script>` tag.
 *
 * By importing the common client module, a Client instance is
 * created at `window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__`. An event listener is
 * attached which relays emitted messages over a WebSocket connection.
 */
import '../common/client';

/**
 * `%PORT%` should be replaced with the port number that the WebSocket server is
 * running on; this replacement should be performed when this script is served
 * by the Electron HTTP server.
 */
const socket = new WebSocket(`ws://localhost:%PORT%`);

const onMessage = (message: any) => {
  socket.send(JSON.stringify({
    type: 'message',
    message
  }));
}

socket.onopen = () => {
  window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__ &&
    window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__.on('message', onMessage);
}

socket.onclose = () => {
  window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__ &&
    window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__.removeListener('message', onMessage);
}
