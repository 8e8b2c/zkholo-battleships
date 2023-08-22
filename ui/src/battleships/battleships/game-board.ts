import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppAgentClient } from '@holochain/client';
import { consume } from '@lit-labs/context';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';

import { clientContext } from '../../contexts';
import { BOARD_SIZE } from './constants';

export type CellFill = 'none' | 'ship' | 'miss' | 'hit' | 'target' | 'invalid';

@customElement('game-board')
export class GameBoard extends LitElement {
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

  handleCellHover(x: number, y: number) {
    this.dispatchEvent(
      new CustomEvent('cell-hover', {
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
          style="width: 100%; height: 100%; background-color: grey;"
        ></div>`;
      case 'miss':
        return html`<div
          style="width: 100%; height: 100%; background-color: lightblue;"
        ></div>`;
      case 'hit':
        return html`<div
          style="width: 100%; height: 100%; background-color: grey; color: red;"
        >
          X
        </div>`;
      case 'target':
        return html`<div>?</div>`;
      case 'invalid':
        return html`<div
          style="width: 100%; height: 100%; background-color: red;"
        ></div>`;
      default:
        return html`<div></div>`;
    }
  }

  render() {
    return html` <div
      style="aspect-ratio: 1; width: 100%; user-select: none; border: solid 1px grey;"
    >
      ${range(BOARD_SIZE).map(
        y =>
          html`<div style="width: 100%; height: 10%;">
            ${range(BOARD_SIZE).map(
              x =>
                // eslint-disable-next-line lit-a11y/click-events-have-key-events
                html`<div
                  @click=${() => this.handleCellClick(x, y)}
                  @mouseover=${() => this.handleCellHover(x, y)}
                  @focus=${() => this.handleCellHover(x, y)}
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
