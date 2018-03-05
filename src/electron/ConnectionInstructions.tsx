import * as React from 'react';
import { ipcRenderer } from 'electron';

interface State {
  script: string;
}

export class ConnectionInstructions extends React.Component<{}, State> {
  state: State = {
    script: ''
  }

  render() {
    const { script } = this.state;

    return (
      <div>
        <h4>React DOM</h4>
        <p>
          Please add <textarea value={script} onClick={this._selectAll} /> to
          the top of the page you want to inspect, <b>before</b> React DOM is
          imported.
        </p>
      </div>
    );
  }

  componentDidMount() {
    ipcRenderer.send('get-client-script');
    ipcRenderer.on('client-script', this._receiveClientScript);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('client-script', this._receiveClientScript);
  }

  protected _receiveClientScript = (event: any, script: string) =>
    this.setState({ script })

  protected _selectAll(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const target = e.target as HTMLTextAreaElement;
    target.selectionStart = 0;
    target.selectionEnd = target.value.length;
  }
}
