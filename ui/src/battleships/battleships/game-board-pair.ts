import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ActionHash, AppAgentClient, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { Task } from '@lit-labs/task';
import { consume } from '@lit-labs/context';
import { groth16 } from 'snarkjs';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';
import {
  FireShotInput,
  GameState,
  GameTranscript,
  HitOrMissProof,
  ProveHitOrMissInput,
  ShipDeployment,
  ShipDeploymentProof,
  Shot,
  ShotOutcome,
  ViewerRole,
} from './types';
import {
  boardWithFill,
  proofToCommaSeparated,
  shipToNumStrArr,
} from './helpers';
import { SHIP_SIZES } from './constants';
import { CellFill } from './game-board';

import circuitWasm from './circuits/move/move_js/move.wasm?url';
import circuitZkey from './circuits/move/move_0001.zkey?url';

interface GameData {
  yourDeployment?: ShipDeployment;
  yourDeploymentProofAndHash?: [ShipDeploymentProof, ActionHash];
  gameTranscript?: GameTranscript;
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

  _fetchGameData = new Task(
    this,
    async ([gameInviteHash]): Promise<GameData> => {
      const yourDeploymentProm = this.fetchYourDeployment(gameInviteHash);
      const yourDeploymentProofAndHashProm =
        this.fetchYourDeploymentProofAndHash(gameInviteHash);
      const gameTranscriptProm = this.fetchGameTranscript(gameInviteHash);
      return {
        yourDeployment: await yourDeploymentProm,
        yourDeploymentProofAndHash: await yourDeploymentProofAndHashProm,
        gameTranscript: await gameTranscriptProm,
      };
    },
    () => [this.gameInviteHash]
  );

  private cachedProofsLength = 0;
  private refreshInterval: number | undefined;

  protected firstUpdated(): void {
    this.refreshInterval = window.setInterval(async () => {
      await this._fetchGameData.run();
      this.checkNeedToProve();
    }, 1_000);
  }

  disconnectedCallback(): void {
    if (this.refreshInterval) {
      window.clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private cachedDeployment: ShipDeployment | undefined;
  async fetchYourDeployment(gameInviteHash: ActionHash) {
    if (this.cachedDeployment) return this.cachedDeployment;
    const record: Record = await this.client.callZome({
      cap_secret: null,
      role_name: 'battleships',
      zome_name: 'battleships',
      fn_name: 'get_your_ship_deployment_for_invite',
      payload: gameInviteHash,
    });
    if (!record) return undefined;
    this.cachedDeployment = decode(
      (record.entry as any).Present.entry
    ) as ShipDeployment;
    return this.cachedDeployment;
  }

  private cachedDeploymentProofAndHash:
    | [ShipDeploymentProof, ActionHash]
    | undefined;
  async fetchYourDeploymentProofAndHash(gameInviteHash: ActionHash) {
    if (this.cachedDeploymentProofAndHash)
      return this.cachedDeploymentProofAndHash;
    const record: Record = await this.client.callZome({
      cap_secret: null,
      role_name: 'battleships',
      zome_name: 'battleships',
      fn_name: 'get_your_ship_deployment_proof_for_invite',
      payload: gameInviteHash,
    });
    if (!record) return undefined;
    const deploymentProof = decode(
      (record.entry as any).Present.entry
    ) as ShipDeploymentProof;
    const deploymentProofHash = record.signed_action.hashed.hash;
    this.cachedDeploymentProofAndHash = [deploymentProof, deploymentProofHash];
    return this.cachedDeploymentProofAndHash;
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
    return decode((record.entry as any).Present.entry) as GameTranscript;
  }

  handleCellHover(e: CustomEvent) {
    const { x, y } = e.detail;
    this.cursor = { x, y };
  }

  handleCellClick(e: CustomEvent) {
    const { x, y } = e.detail;
    // eslint-disable-next-line
    console.log(this.gameState);
    if (this.canFire()) {
      this.handleShot(x, y);
    }
  }

  canFire() {
    if (this.gameState.type !== 'GameStarted') return false;
    return (
      (this.gameState.turn.type === 'AwayShot' && this.viewerRole === 'away') ||
      (this.gameState.turn.type === 'HomeShot' && this.viewerRole === 'home')
    );
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

  checkNeedToProve() {
    if (this.gameState.type !== 'GameStarted') return;
    if (
      !this._fetchGameData.value?.gameTranscript ||
      !this._fetchGameData.value?.yourDeployment ||
      !this._fetchGameData.value?.yourDeploymentProofAndHash
    )
      return;
    const { gameTranscript, yourDeployment, yourDeploymentProofAndHash } =
      this._fetchGameData.value;

    if (
      this.gameState.turn.type === 'HomeProof' &&
      this.viewerRole === 'home'
    ) {
      const { away_player_shots, home_player_hit_or_miss_proofs } =
        gameTranscript;
      if (
        away_player_shots.length > home_player_hit_or_miss_proofs.length &&
        away_player_shots.length > this.cachedProofsLength
      ) {
        const { x, y } = away_player_shots[away_player_shots.length - 1];
        this.createHitOrMissProof(
          x,
          y,
          yourDeployment,
          yourDeploymentProofAndHash[1],
          yourDeploymentProofAndHash[0].commitment,
          away_player_shots.length
        );
      }
    }
    if (
      this.gameState.turn.type === 'AwayProof' &&
      this.viewerRole === 'away'
    ) {
      const { home_player_shots, away_player_hit_or_miss_proofs } =
        gameTranscript;
      if (
        home_player_shots.length > away_player_hit_or_miss_proofs.length &&
        home_player_shots.length > this.cachedProofsLength
      ) {
        const { x, y } = home_player_shots[home_player_shots.length - 1];
        this.createHitOrMissProof(
          x,
          y,
          yourDeployment,
          yourDeploymentProofAndHash[1],
          yourDeploymentProofAndHash[0].commitment,
          home_player_shots.length
        );
      }
    }
  }

  isProving = false;
  async createHitOrMissProof(
    x: number,
    y: number,
    yourDeployment: ShipDeployment,
    yourDeploymentProofHash: ActionHash,
    commitment: string,
    proofsLengthWhenDone: number
  ) {
    if (this.isProving) return;
    try {
      this.isProving = true;
      const { proofStr, isHit } = await this.proveHitOrMiss(
        x,
        y,
        yourDeployment,
        commitment
      );
      const hitOrMissProof: HitOrMissProof = {
        deployment_proof: yourDeploymentProofHash,
        deployment_commitment: commitment,
        shot: { x, y },
        hit: isHit,
        proof: proofStr,
      };
      const payload: ProveHitOrMissInput = {
        hit_or_miss_proof: hitOrMissProof,
        game_invite_hash: this.gameInviteHash,
      };
      const _proofRecord: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'prove_hit_or_miss',
        payload,
      });
      this.cachedProofsLength = proofsLengthWhenDone;
    } catch (e: any) {
      // eslint-disable-next-line
      // console.log('error', e);
      const errorSnackbar = this.shadowRoot?.getElementById(
        'snackbar'
      ) as Snackbar;
      errorSnackbar.labelText = `Error proving hit/miss: ${e?.data?.data}`;
      errorSnackbar.show();
    }

    this.isProving = false;
  }

  async proveHitOrMiss(
    x: number,
    y: number,
    yourDeployment: ShipDeployment,
    commitment: string
  ) {
    // eslint-disable-next-line
    console.log('commitment', commitment);
    const inputs = {
      nonce: yourDeployment.salt,
      ships: yourDeployment.ships.map(shipToNumStrArr),
      boardHash: commitment,
      guess: [x.toString(), y.toString()],
    };
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      circuitWasm,
      circuitZkey
    );
    // eslint-disable-next-line
    console.log(proof);
    const proofStr = proofToCommaSeparated(proof);
    const [isHit, _boardHash, _x, _y] = publicSignals;
    // eslint-disable-next-line
    console.log(publicSignals);
    return { proofStr, isHit: !!Number(isHit) };
  }

  getTopCells({ yourDeployment, gameTranscript }: GameData) {
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
    let shots: Shot[] | undefined;
    if (this.viewerRole === 'home') {
      shots = gameTranscript?.away_player_shots;
    } else if (this.viewerRole === 'away') {
      shots = gameTranscript?.home_player_shots;
    } else {
      shots = gameTranscript?.away_player_shots;
    }
    if (!shots) return cells;

    for (const shot of shots) {
      if (cells[shot.x][shot.y] === 'ship') {
        cells[shot.x][shot.y] = 'hit';
      } else {
        cells[shot.x][shot.y] = 'miss';
      }
    }
    return cells;
  }

  getBottomCells({ gameTranscript }: GameData) {
    const cells = boardWithFill('none' as CellFill);

    if (this.canFire() && this.cursor) {
      cells[this.cursor.x][this.cursor.y] = 'target';
    }

    let shots: Shot[] | undefined;
    let shotOutcomes: ShotOutcome[] | undefined;
    if (this.viewerRole === 'home') {
      shots = gameTranscript?.home_player_shots;
      shotOutcomes = gameTranscript?.away_player_hit_or_miss_proofs;
    } else if (this.viewerRole === 'away') {
      shots = gameTranscript?.away_player_shots;
      shotOutcomes = gameTranscript?.home_player_hit_or_miss_proofs;
    } else {
      shots = gameTranscript?.home_player_shots;
      shotOutcomes = gameTranscript?.away_player_hit_or_miss_proofs;
    }
    if (!shotOutcomes) return cells;
    if (!shots) return cells;

    for (let i = 0; i < shotOutcomes.length; i += 1) {
      const shot = shots[i];
      const { hit, pending } = shotOutcomes[i];
      if (hit) {
        cells[shot.x][shot.y] = 'hit';
      } else if (pending) {
        cells[shot.x][shot.y] = 'target';
      } else {
        cells[shot.x][shot.y] = 'miss';
      }
    }
    return cells;
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
      <game-board .cells=${this.getTopCells(gameData)}></game-board>
      <h3>${bottomLabel}</h3>
      <span>${this.getStatusText()}</span>
      <game-board
        @cell-hover=${this.handleCellHover}
        @cell-click=${this.handleCellClick}
        .cells=${this.getBottomCells(gameData)}
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
    return this._fetchGameData.render({
      pending: () =>
        this._fetchGameData.value
          ? this.renderBoardPair(this._fetchGameData.value)
          : this.renderLoading(),
      complete: value => this.renderBoardPair(value),
      error: (e: any) =>
        html`<span>Error fetching the game invite: ${e.data.data}</span>`,
    });
  }
}
