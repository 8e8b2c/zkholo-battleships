import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ActionHash, AppAgentClient, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { Task } from '@lit-labs/task';
import { consume } from '@lit-labs/context';
import { Dialog } from '@material/mwc-dialog';

import { clientContext } from '../../contexts';
import './create-game-invite';
import './game-board-pair';
import { GameInvite, GameState, ViewerRole } from './types';

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
      const gameStateProm: Promise<GameState> = this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_game_state',
        payload: gameInviteHash,
      });
      const role = await this.getRole(gameInviteHash);
      const gameState = await gameStateProm;
      return { gameState, role };
    },
    () => [this.gameInviteHash]
  );

  protected firstUpdated(): void {
    setInterval(() => {
      this._fetchGameState.run();
    }, 1_000);
  }

  show() {
    const dialog = this.shadowRoot?.getElementById('dialog') as Dialog;
    dialog.show();
  }

  async getRole(gameInviteHash: ActionHash): Promise<ViewerRole> {
    const record: Record | undefined = await this.client.callZome({
      cap_secret: null,
      role_name: 'battleships',
      zome_name: 'battleships',
      fn_name: 'get_game_invite',
      payload: gameInviteHash,
    });
    if (!record) return 'unknown';
    const gameInvite = decode(
      (record.entry as any).Present.entry
    ) as GameInvite;
    const myPubKeyStr = this.client.myPubKey.toString();
    if (myPubKeyStr === gameInvite.away_player.toString()) {
      return 'away';
    }
    if (myPubKeyStr === gameInvite.home_player.toString()) {
      return 'home';
    }
    return 'spectator';
  }

  renderGame({ gameState, role }: { gameState: GameState; role: ViewerRole }) {
    if (role === 'unknown') {
      return html`<span>Player unknown</span>`;
    }
    const needsToDeploy =
      gameState.type === 'AwaitingBothDeployments' ||
      (role === 'home' && gameState.type === 'AwaitingHomeDeployment') ||
      (role === 'away' && gameState.type === 'AwaitingAwayDeployment');
    if (needsToDeploy) {
      return html`<create-ship-deployment
        .gameInviteHash=${this.gameInviteHash}
      ></create-ship-deployment>`;
    }
    return html`<game-board-pair
      .gameInviteHash=${this.gameInviteHash}
      .viewerRole=${role}
      .gameState=${gameState}
    ></game-board-pair>`;
  }

  renderLoading() {
    return html`<div
      style="display: flex; flex: 1; align-items: center; justify-content: center"
    >
      <mwc-circular-progress indeterminate></mwc-circular-progress>
    </div>`;
  }

  renderContent() {
    if (!this.gameInviteHash) return html`<span>No game selected</span>`;

    return this._fetchGameState.render({
      pending: () =>
        this._fetchGameState.value
          ? this.renderGame(this._fetchGameState.value)
          : this.renderLoading(),
      complete: value =>
        value ? this.renderGame(value) : html`<span>No selection</span>`,
      error: (e: any) =>
        html`<span>Error fetching the game invite: ${e.data.data}</span>`,
    });
  }

  render() {
    return html`
      <mwc-dialog id="dialog"> ${this.renderContent()} </mwc-dialog>
    `;
  }
}
