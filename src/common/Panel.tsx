import * as React from 'react';
import { where, equals } from 'ramda';

import { App } from './App';
import { ClientInterface } from './client-interface';
import { ConnectionOverlay } from './ConnectionOverlay';

interface Props {
  ConnectionInstructions: React.ComponentClass;
  clientInterface: ClientInterface;
}

interface State {
  connected: boolean;
  lostPreviousConnection: boolean;
}

export class Panel extends React.Component<Props, State> {
  protected _unsub?: () => void;

  state: State = {
    connected: false,
    lostPreviousConnection: false
  }

  render() {
    const { ConnectionInstructions, clientInterface } = this.props;
    const { connected, lostPreviousConnection } = this.state;

    return (
      <div>
        <App
          connected={connected}
          clientInterface={clientInterface}
        />
        <ConnectionOverlay
          visible={!connected}
          disconnected={lostPreviousConnection}
        >
          <ConnectionInstructions />
        </ConnectionOverlay>
      </div>
    );
  }

  componentDidMount() {
    const { clientInterface } = this.props;

    this._unsub = clientInterface.subscribe([
      [where({ type: equals('connected') }), () => this.setState({ connected: true })],
      [where({ type: equals('disconnected') }), () => this.setState({ connected: false, lostPreviousConnection: true })]
    ])
  }

  componentWillUnmount() {
    this._unsub && this._unsub();
  }
}
