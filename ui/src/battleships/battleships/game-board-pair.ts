import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ActionHash, AppAgentClient, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { Task } from '@lit-labs/task';
import { consume } from '@lit-labs/context';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';
import { GameState, ShipDeployment, ViewerRole } from './types';
import { boardWithFill } from './helpers';
import { SHIP_SIZES } from './constants';
import { CellFill } from './game-board';

interface GameData {
  yourDeployment?: ShipDeployment;
}

@customElement('game-board-pair')
export class GameBoardPair extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property()
  gameInviteHash!: ActionHash;

  @property()
  viewerRole!: ViewerRole;

  @property()
  gameState!: GameState;

  _fetchYourDeployment = new Task(
    this,
    async ([gameInviteHash]): Promise<GameData> => {
      const record: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_your_ship_deployment_for_invite',
        payload: gameInviteHash,
      });
      if (!record) return {};
      const yourDeployment = decode(
        (record.entry as any).Present.entry
      ) as ShipDeployment;
      return { yourDeployment };
    },
    () => [this.gameInviteHash]
  );

  getTopCells(yourDeployment?: ShipDeployment) {
    const cells = boardWithFill('none' as CellFill);
    if (yourDeployment) {
      for (let i = 0; i < SHIP_SIZES.length; i += 1) {
        const ship = yourDeployment.ships[i];
        const shipSize = SHIP_SIZES[i];
        for (let j = 0; j < shipSize; j += 1) {
          const { x, y } = ship.horizontal
            ? { x: ship.x + j, y: ship.y }
            : { x: ship.x, y: ship.y + j };
          cells[x][y] = 'ship';
        }
      }
    }
    return cells;
  }

  getBottomCells() {
    return boardWithFill('none');
  }

  renderBoardPair(gameData: GameData) {
    const topLabel = this.viewerRole === 'spectator' ? 'Home' : 'You';
    const bottomLabel = this.viewerRole === 'spectator' ? 'Away' : 'Opponent';
    const isAwaitingOpponentDeployment =
      (this.viewerRole === 'home' &&
        this.gameState.type === 'AwaitingAwayDeployment') ||
      (this.viewerRole === 'away' &&
        this.gameState.type === 'AwaitingHomeDeployment');
    const statusText = isAwaitingOpponentDeployment
      ? 'Waiting for opponent to deploy ships'
      : '';
    return html`
      <h3>${topLabel}</h3>
      <game-board
        .cells=${this.getTopCells(gameData.yourDeployment)}
      ></game-board>
      <h3>${bottomLabel}</h3>
      <span>${statusText}</span>
      <game-board .cells=${this.getBottomCells()}></game-board>
    `;
  }
  renderLoading() {
    return html`<div
      style="display: flex; flex: 1; align-items: center; justify-content: center"
    >
      <mwc-circular-progress indeterminate></mwc-circular-progress>
    </div>`;
  }
  render() {
    return this._fetchYourDeployment.render({
      pending: () =>
        this._fetchYourDeployment.value
          ? this.renderBoardPair(this._fetchYourDeployment.value)
          : this.renderLoading(),
      complete: value => this.renderBoardPair(value),
      error: (e: any) =>
        html`<span>Error fetching the game invite: ${e.data.data}</span>`,
    });
  }
}
