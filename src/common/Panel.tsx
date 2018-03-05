import * as React from 'react';

import { App } from './App';
import { Bus, BusConstructor } from './message';
import './Panel.scss';

interface Props {
  ConnectionInstructions: React.ComponentClass;
  messageBus: BusConstructor;
}

interface State {
  connected: boolean;
  lostPreviousConnection: boolean;
}

export class Panel extends React.Component<Props, State> {
  protected _messageBus!: Bus;

  state: State = {
    connected: false,
    lostPreviousConnection: false
  }

  render() {
    if (this.state.connected) {
      return (
        <App messageBus={this._messageBus} />
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
    this._messageBus = new this.props.messageBus({
      onConnect: () => {
        this.setState({ connected: true });
      },

      onDisconnect: () => {
        this.setState({
          connected: false,
          lostPreviousConnection: true
        });
      }
    });
  }

  protected _renderDisconnected() {
    return this.state.lostPreviousConnection && (
      <div className="disconnected">
        Lost connection to the inspected page
      </div>
    );
  }
}
