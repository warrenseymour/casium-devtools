import { install, Message, DependencyTraceMessage, DependencyTraceResultMessage } from '../common/client';

const client = install();
client.createQueue('WebExtension');

client.subscribe('WebExtension', message => {
  window.postMessage(message, '*');
});

window.addEventListener('message', ({ data }: { data: Message }) => {
  if ((data as DependencyTraceMessage).type === 'dependencyTrace') {
    return window.postMessage({
      source: 'CasiumDevToolsClient',
      type: 'dependencyTraceResult',
      result: client.dependencyTrace((data as DependencyTraceMessage).messages)
    } as DependencyTraceResultMessage, '*')
  }
});
