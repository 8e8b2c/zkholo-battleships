import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  ActionHash,
  AppAgentClient,
  encodeHashToBase64,
} from '@holochain/client';
import { Task } from '@lit-labs/task';
import { consume } from '@lit-labs/context';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { Snackbar } from '@material/mwc-snackbar';
import { Dialog } from '@material/mwc-dialog';

import { clientContext } from '../../contexts';
import './create-game-invite';
import { GameState } from './types';

@customElement('game-dialog')
export class GameDialog extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property({
    hasChanged: (newVal: ActionHash, oldVal: ActionHash) =>
      newVal?.toString() !== oldVal?.toString(),
  })
  gameInviteHash: ActionHash | undefined;

  _fetchGameState = new Task(
    this,
    async ([gameInviteHash]) => {
      if (!gameInviteHash) return undefined;
      return this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_game_state',
        payload: gameInviteHash,
      }) as Promise<GameState | undefined>;
    },
    () => [this.gameInviteHash]
  );

  show() {
    const dialog = this.shadowRoot?.getElementById('dialog') as Dialog;
    dialog.show();
  }

  renderGame(gameState: GameState) {
    const deploying =
      gameState.type === 'AwaitingBothDeployments' ||
      gameState.type === 'AwaitingDeployment';
    if (deploying) {
      return html`<create-ship-deployment
        .gameInviteHash=${this.gameInviteHash}
      ></create-ship-deployment>`;
    }
    return html`<span>TODO</span>`;
  }

  renderContent() {
    if (!this.gameInviteHash) return html`<span>No game selected</span>`;

    return this._fetchGameState.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: gameState =>
        gameState
          ? this.renderGame(gameState)
          : html`<span>No game state</span>`,
      error: (e: any) =>
        html`<span>Error fetching the game invite: ${e.data.data}</span>`,
    });
  }

  render() {
    return html`
      <mwc-snackbar id="snackbar" leading></mwc-snackbar>
      <mwc-dialog id="dialog"> ${this.renderContent()} </mwc-dialog>
    `;
  }
}
