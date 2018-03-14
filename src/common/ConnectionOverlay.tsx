import * as React from 'react';

import './ConnectionOverlay.scss';

interface Props {
  visible: boolean;
  disconnected: boolean;
}

export class ConnectionOverlay extends React.Component<Props> {
  render() {
    if (!this.props.visible) {
      return null;
    }

    return (
      <div className="connection-overlay">
        {this._renderDisconnected()}
        <h2>Waiting for Casium to connect...</h2>
        {this.props.children}
      </div>
    );
  }

  protected _renderDisconnected() {
    return this.props.disconnected && (
      <div className="disconnected">
        Lost connection to the inspected page
      </div>
    );
  }
}
