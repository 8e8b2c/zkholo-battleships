import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ActionHash, AppAgentClient, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { Task } from '@lit-labs/task';
import { consume } from '@lit-labs/context';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';
import { FireShotInput, GameState, ShipDeployment, ViewerRole } from './types';
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

  @state()
  cursor: { x: number; y: number } | undefined;

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

  async fetchYourDeployment(gameInviteHash: ActionHash) {
    const record: Record = await this.client.callZome({
      cap_secret: null,
      role_name: 'battleships',
      zome_name: 'battleships',
      fn_name: 'get_your_ship_deployment_for_invite',
      payload: gameInviteHash,
    });
    if (!record) return undefined;
    return decode((record.entry as any).Present.entry) as ShipDeployment;
  }

  async fetchGameTranscript(gameInviteHash: ActionHash) {
    const record: Record = await this.client.callZome({
      cap_secret: null,
      role_name: 'battleships',
      zome_name: 'battleships',
      fn_name: 'get_latest_game_transcript_for_game_invite',
      payload: gameInviteHash,
    });
    if (!record) return undefined;
    return decode((record.entry as any).Present.entry) as ShipDeployment;
  }

  handleCellHover(e: CustomEvent) {
    const { x, y } = e.detail;
    this.cursor = { x, y };
  }

  handleCellClick(e: CustomEvent) {
    const { x, y } = e.detail;
    // eslint-disable-next-line
    console.log(this.gameState);
    if (this.gameState.type !== 'GameStarted') return;
    if (
      (this.gameState.turn.type === 'AwayShot' && this.viewerRole === 'away') ||
      (this.gameState.turn.type === 'HomeShot' && this.viewerRole === 'home')
    ) {
      this.handleShot(x, y);
    }
  }

  async handleShot(x: number, y: number) {
    const fireShotInput: FireShotInput = {
      game_invite_hash: this.gameInviteHash,
      shot: { x, y },
    };

    try {
      const record: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'fire_shot',
        payload: fireShotInput,
      });

      this.dispatchEvent(
        new CustomEvent('shot-fired', {
          composed: true,
          bubbles: true,
          detail: { gameInviteHash: this.gameInviteHash },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        'snackbar'
      ) as Snackbar;
      errorSnackbar.labelText = `Error firing shot: ${e?.data?.data}`;
      errorSnackbar.show();
    }
  }

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

  getStatusText() {
    if (
      (this.viewerRole === 'home' &&
        this.gameState.type === 'AwaitingAwayDeployment') ||
      (this.viewerRole === 'away' &&
        this.gameState.type === 'AwaitingHomeDeployment')
    ) {
      return 'Waiting for opponent to deploy ships';
    }
    if (this.gameState.type === 'GameStarted') {
      switch (this.viewerRole) {
        case 'home':
          switch (this.gameState.turn.type) {
            case 'HomeShot':
              return 'Your turn to fire';
            case 'HomeProof':
              return 'Proving hit/miss';
            case 'AwayShot':
              return "Opponent's turn";
            case 'AwayProof':
              return "Waiting for opponent's hit/miss proof";
            default:
              return '';
          }
        case 'away':
          switch (this.gameState.turn.type) {
            case 'AwayShot':
              return 'Your turn to fire';
            case 'AwayProof':
              return 'Proving hit/miss';
            case 'HomeShot':
              return "Opponent's turn";
            case 'HomeProof':
              return "Waiting for opponent's hit/miss proof";
            default:
              return '';
          }
        default:
          return '';
      }
    }
    return '';
  }

  renderBoardPair(gameData: GameData) {
    const topLabel = this.viewerRole === 'spectator' ? 'Home' : 'You';
    const bottomLabel = this.viewerRole === 'spectator' ? 'Away' : 'Opponent';
    return html`
      <mwc-snackbar id="snackbar" leading></mwc-snackbar>
      <h3>${topLabel}</h3>
      <game-board
        .cells=${this.getTopCells(gameData.yourDeployment)}
      ></game-board>
      <h3>${bottomLabel}</h3>
      <span>${this.getStatusText()}</span>
      <game-board
        @cell-hover=${this.handleCellHover}
        @cell-click=${this.handleCellClick}
        .cells=${this.getBottomCells()}
      ></game-board>
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
