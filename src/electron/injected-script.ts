import { Instrumenter } from '../common/instrumenter';

new Instrumenter().addBackend('Electron_%PID%', ({ connect, disconnect, send }) => {
  let queue: string[] = [];
  const socket = new WebSocket('ws://localhost:%PORT%');

  socket.onopen = () => {
    queue.forEach(queued => socket.send(queued));
    queue = [];

    connect();
  }

  socket.onclose = () => disconnect();

  socket.onmessage = message => {
    send(JSON.parse(message.data));
  }

  return message => {
    const payload = JSON.stringify(message);
    socket.readyState === socket.OPEN ? socket.send(payload) : queue.push(payload);
  }
});
