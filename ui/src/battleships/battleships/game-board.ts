import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppAgentClient, encodeHashToBase64 } from '@holochain/client';
import { consume } from '@lit-labs/context';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';

export type CellFill = 'none' | 'ship' | 'miss' | 'hit' | 'target';

@customElement('game-board')
export class CopyAgentPubKey extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property() cells!: CellFill[][];

  handleCellClick(x: number, y: number) {
    this.dispatchEvent(
      new CustomEvent('cell-click', {
        detail: { x, y },
        bubbles: true,
        composed: true,
      })
    );
  }

  renderCellContent(x: number, y: number) {
    switch (this.cells[x][y]) {
      case 'none':
        return html`<div></div>`;
      case 'ship':
        return html`<div
          style="width: 100%; height: 100%; background-color: grey"
        ></div>`;
      case 'miss':
        return html`<div
          style="width: 100%; height: 100%; background-color: light-blue"
        ></div>`;
      case 'hit':
        return html`<div
          style="width: 100%; height: 100%; background-color: grey; color: red;"
        >
          X
        </div>`;
      case 'target':
        return html`<div>?</div>`;
      default:
        return html`<div></div>`;
    }
  }

  render() {
    return html` <div style="aspect-ratio: 1; width: 100%;">
      ${range(10).map(
        y =>
          html`<div style="width: 100%; height: 10%;">
            ${range(10).map(
              x =>
                // eslint-disable-next-line lit-a11y/click-events-have-key-events
                html`<div
                  @click=${() => this.handleCellClick(x, y)}
                  style="height: 100%; width: 10%; float: left;"
                >
                  ${this.renderCellContent(x, y)}
                </div>`
            )}
          </div>`
      )}
    </div>`;
  }
}

function range(length: number) {
  return Array.from({ length }, (_, idx) => idx);
}
