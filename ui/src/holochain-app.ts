import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  AppAgentWebsocket,
  ActionHash,
  AppAgentClient,
} from '@holochain/client';
import { provide } from '@lit-labs/context';
import '@material/mwc-circular-progress';
import '@material/mwc-button';
import '@material/mwc-dialog';

import { clientContext } from './contexts';
import './battleships/battleships/new-game-dialog';
import './battleships/battleships/game-dialog';
import { NewGameDialog } from './battleships/battleships/new-game-dialog';
import { GameDialog } from './battleships/battleships/game-dialog';
import './battleships/battleships/invite-list';

@customElement('holochain-app')
export class HolochainApp extends LitElement {
  @state() loading = true;
  @state() selectedGameInvite: ActionHash | undefined;

  @provide({ context: clientContext })
  @property({ type: Object })
  client!: AppAgentClient;

  async firstUpdated() {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    this.client = await AppAgentWebsocket.connect('', 'battleships');

    this.loading = false;

    // Hacky work around due to being unable to detect dialog cancel event :-/
    setInterval(() => this.checkDialogNeedsClearing(), 1_000);
  }

  showNewGameDialog() {
    const dialog = this.shadowRoot?.getElementById(
      'new-game-dialog'
    ) as NewGameDialog;
    dialog.show();
  }

  handleNewGame(e: CustomEvent) {
    this.selectedGameInvite = e.detail.gameInviteHash;
    const newGameDialog = this.shadowRoot?.getElementById(
      'new-game-dialog'
    ) as NewGameDialog;
    newGameDialog.close();
    const gameDialog = this.shadowRoot?.getElementById(
      'game-dialog'
    ) as GameDialog;
    gameDialog.show();
  }

  handleInviteSelect(e: CustomEvent) {
    const dialog = this.shadowRoot?.getElementById('game-dialog') as GameDialog;
    this.selectedGameInvite = e.detail.inviteHash;
    dialog.show();
  }

  checkDialogNeedsClearing() {
    if (this.selectedGameInvite) {
      const dialog = this.shadowRoot?.getElementById(
        'game-dialog'
      ) as GameDialog;
      if (!dialog.open) {
        this.selectedGameInvite = undefined;
      }
    }
  }

  render() {
    if (this.loading)
      return html`
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      `;

    return html`
      <new-game-dialog
        id="new-game-dialog"
        @game-invite-created=${this.handleNewGame}
      >
      </new-game-dialog>
      <game-dialog .gameInviteHash=${this.selectedGameInvite} id="game-dialog">
      </game-dialog>
      <main>
        <h1>Battleships</h1>
        <mwc-button
          raised
          label="New Game"
          @click=${this.showNewGameDialog}
        ></mwc-button>

        <invite-list
          @invite-select=${this.handleInviteSelect}
          .recipient=${this.client.myPubKey}
        ></invite-list>
      </main>
    `;
  }

  static styles = css`
    :host {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      font-size: calc(10px + 2vmin);
      color: #1a2b42;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      background-color: var(--lit-element-background-color);
    }

    main {
      flex-grow: 1;
    }

    .app-footer {
      font-size: calc(12px + 0.5vmin);
      align-items: center;
    }

    .app-footer a {
      margin-left: 5px;
    }
  `;
}
