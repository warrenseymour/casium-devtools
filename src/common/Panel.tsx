import * as React from 'react';
import { where, equals } from 'ramda';

import { App } from './App';
import { ClientInterface } from './client-interface';
import './Panel.scss';

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

    if (this.state.connected) {
      return (
        <App clientInterface={clientInterface} />
      );
    }

    return (
      <div className="connect">
        {this._renderDisconnected()}
        <h2>Waiting for Casium to connect...</h2>
        <ConnectionInstructions />
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

  protected _renderDisconnected() {
    return this.state.lostPreviousConnection && (
      <div className="disconnected">
        Lost connection to the inspected page
      </div>
    );
  }
}
