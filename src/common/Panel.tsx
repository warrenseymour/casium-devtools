import * as React from 'react';

import { App } from './App';
import './Panel.scss';

interface Props {
  ConnectionInstructions: React.ComponentClass;
}

interface State {
  connected: boolean;
  lostPreviousConnection: boolean;
}

export class Panel extends React.Component<Props, State> {
  state: State = {
    connected: false,
    lostPreviousConnection: false
  }

  render() {
    if (this.state.connected) {
      return (
        <App />
      );
    }

    const { ConnectionInstructions } = this.props;
    return (
      <div className="connect">
        {this._renderDisconnected()}
        <h2>Waiting for Casium to connect...</h2>
        <ConnectionInstructions />
      </div>
    );
  }

  componentDidMount() {
    window.MESSAGE_BUS.onConnect = () => {
      this.setState({ connected: true });
    }

    window.MESSAGE_BUS.onDisconnect = () => {
      this.setState({
        connected: false,
        lostPreviousConnection: true
      });
    }
  }

  protected _renderDisconnected() {
    return this.state.lostPreviousConnection && (
      <div className="disconnected">
        Lost connection to the inspected page
      </div>
    );
  }
}
