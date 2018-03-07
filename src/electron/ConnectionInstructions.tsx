import * as React from 'react';

export class ConnectionInstructions extends React.Component {
  render() {
    const port = process.env.CASIUM_DEVTOOLS_PORT || '8080';

    const scriptTag = `<script src="http://localhost:${port}"></script>`;

    return (
      <div>
        <h4>React DOM</h4>
        <p>
          Please add <input defaultValue={scriptTag} onClick={this._selectAll} /> to
          the top of the page you want to inspect.
        </p>
      </div>
    );
  }

  protected _selectAll(e: React.SyntheticEvent<HTMLInputElement>) {
    const target = e.target as HTMLInputElement;
    target.selectionStart = 0;
    target.selectionEnd = target.value.length;
  }
}
