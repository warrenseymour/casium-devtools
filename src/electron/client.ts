/**
 * Exposes a WebSocket -> window.postMessage interface using an IIFE. The
 * Electron UI should display the compiled version of this code so that users
 * may paste it into their application as a `<script>` tag. The `%`-enclosed
 * strings should be replaced by the Electron UI before rendering.
 */
((port: string) => {
  const _socket = new WebSocket(`ws://localhost:${port}`);

  const send = (data: {}) => {
    _socket.send(JSON.stringify(data));
  }

  window.addEventListener('message', ({ data }) => {
    if (!data || data.from !== 'Arch') {
      return;
    }

    send(data);
  });

  _socket.onmessage = ({ data }) => {
    window.postMessage(JSON.parse(data), '*');
  }
})('%PORT%')
