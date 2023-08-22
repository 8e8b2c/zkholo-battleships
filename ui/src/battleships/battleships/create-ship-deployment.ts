import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, AppAgentClient } from '@holochain/client';
import { consume } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-textarea';
import '@material/mwc-snackbar';
import { Snackbar } from '@material/mwc-snackbar';
import { groth16 } from 'snarkjs';

import { clientContext } from '../../contexts';
import { Ship, ShipDeployment, ShipDeploymentProof } from './types';
import './game-board';
import { CellFill } from './game-board';

import circuitWasm from './circuits/create/create_js/create.wasm?url';
import circuitZkey from './circuits/create/create_0001.zkey?url';
import {
  ShipLabel,
  BOARD_SIZE,
  SHIP_SIZES_ENTRIES,
  SHIP_SIZE_TO_LABEL,
} from './constants';
import { boardWithFill } from './helpers';

interface Ships {
  '5'?: Ship;
  '4'?: Ship;
  '3_a'?: Ship;
  '3_b'?: Ship;
  '2'?: Ship;
}

@customElement('create-ship-deployment')
export class CreateShipDeployment extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property()
  gameInviteHash!: ActionHash;

  @state()
  ships: Ships = {};

  @state()
  activeShip: ShipLabel | undefined;

  @state()
  cursor: { x: number; y: number } | undefined;

  @state()
  horizontal = false;

  firstUpdated() {
    if (this.gameInviteHash === undefined) {
      throw new Error(
        `The invite input is required for the create-ship-placements element`
      );
    }
    if (this.ships === undefined) {
      throw new Error(
        `The ships input is required for the create-ship-placements element`
      );
    }
  }

  // Returns true if all fill attempts are valid
  fillAndCheckCells(board: boolean[][], ship: Ship, shipSize: number) {
    for (let j = 0; j < shipSize; j += 1) {
      const { x, y } = ship.horizontal
        ? { x: ship.x + j, y: ship.y }
        : { x: ship.x, y: ship.y + j };
      if (x >= BOARD_SIZE || y >= BOARD_SIZE) return false;
      if (board[x][y]) return false;
      // eslint-disable-next-line no-param-reassign
      board[x][y] = true;
    }
    return true;
  }

  isShipDeploymentValid() {
    const board = boardWithFill(false);
    const shipIsValid = (shipSize: number, ship?: Ship) => {
      if (!ship) return false;
      return this.fillAndCheckCells(board, ship, shipSize);
    };
    return (
      shipIsValid(5, this.ships[5]) &&
      shipIsValid(4, this.ships[4]) &&
      shipIsValid(3, this.ships['3_a']) &&
      shipIsValid(3, this.ships['3_b']) &&
      shipIsValid(2, this.ships[2])
    );
  }

  async provePlacement(salt: string) {
    const ships = [
      this.ships['5']!,
      this.ships['4']!,
      this.ships['3_a']!,
      this.ships['3_b']!,
      this.ships['2']!,
    ].map(ship => [
      ship.x.toString(),
      ship.y.toString(),
      ship.horizontal ? '1' : '0',
    ]);
    const inputs = { nonce: salt, ships };
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      circuitWasm,
      circuitZkey
    );
    // eslint-disable-next-line
    console.log(proof);
    const proofStr = [
      proof.pi_a[0],
      proof.pi_a[1],
      proof.pi_b[0][0],
      proof.pi_b[0][1],
      proof.pi_b[1][0],
      proof.pi_b[1][1],
      proof.pi_c[0],
      proof.pi_c[1],
    ].join(',');
    const [commitment] = publicSignals;
    return { proofStr, commitment };
  }

  async createShipDeployment() {
    try {
      const salt = Math.floor(
        Math.random() * Number.MAX_SAFE_INTEGER
      ).toString();
      const { proofStr, commitment } = await this.provePlacement(salt);
      // Could generate salt that uses whole field - but good enough for demo
      const shipDeployment: ShipDeployment = {
        invite: this.gameInviteHash,
        ships: [
          this.ships['5']!,
          this.ships['4']!,
          this.ships['3_a']!,
          this.ships['3_b']!,
          this.ships['2']!,
        ],
        salt,
      };
      const privateRecord: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'create_ship_deployment',
        payload: shipDeployment,
      });

      this.dispatchEvent(
        new CustomEvent('ship-deployment-created', {
          composed: true,
          bubbles: true,
          detail: {
            shipDeploymentHash: privateRecord.signed_action.hashed.hash,
          },
        })
      );

      const shipDeploymentProof: ShipDeploymentProof = {
        invite: this.gameInviteHash,
        private_entry: privateRecord.signed_action.hashed.hash,
        commitment,
        proof: proofStr,
      };
      const proofRecord: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'create_ship_deployment_proof',
        payload: shipDeploymentProof,
      });

      this.dispatchEvent(
        new CustomEvent('ship-deployment-proof-created', {
          composed: true,
          bubbles: true,
          detail: {
            shipDeploymentProofHash: proofRecord.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      // eslint-disable-next-line
      console.error(e);
      // eslint-disable-next-line
      console.error('data', e?.data?.data);
      const errorSnackbar = this.shadowRoot?.getElementById(
        'create-error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error creating the ship placements: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  liftShip(label: ShipLabel) {
    this.ships[label] = undefined;
    this.activeShip = label;
  }

  handleCellHover(e: CustomEvent) {
    const { x, y } = e.detail;
    this.cursor = { x, y };
  }

  handleCellClick(e: CustomEvent) {
    if (!this.activeShip) return;
    const { x, y } = e.detail;
    const ship: Ship = { x, y, horizontal: this.horizontal };
    if (!this.positionIsValid(this.activeShip, ship)) return;
    this.ships[this.activeShip] = ship;
    this.activeShip = undefined;
  }

  handleHorizontalToggle() {
    this.horizontal = !this.horizontal;
  }

  positionIsValid(labelToCheck: ShipLabel, ship: Ship) {
    const cells = boardWithFill(false);
    for (const [label, shipSize] of SHIP_SIZES_ENTRIES) {
      const existingShip = this.ships[label];
      if (existingShip) this.fillAndCheckCells(cells, existingShip, shipSize);
    }
    return this.fillAndCheckCells(
      cells,
      ship,
      SHIP_SIZE_TO_LABEL[labelToCheck]
    );
  }

  shipsAsCells() {
    const cells = boardWithFill('none' as CellFill);

    const getShipAndFill = (
      label: ShipLabel
    ): { ship: Ship | undefined; fill: CellFill } => {
      if (this.activeShip === label) {
        if (!this.cursor) return { ship: undefined, fill: 'none' };
        const ship = { ...this.cursor, horizontal: this.horizontal };
        const fill = this.positionIsValid(label, ship) ? 'ship' : 'invalid';
        return { ship, fill };
      }
      return { ship: this.ships[label], fill: 'ship' };
    };

    for (const [label, shipSize] of SHIP_SIZES_ENTRIES) {
      const { ship, fill } = getShipAndFill(label);
      if (ship) {
        for (let j = 0; j < shipSize; j += 1) {
          const { x, y } = ship.horizontal
            ? { x: ship.x + j, y: ship.y }
            : { x: ship.x, y: ship.y + j };
          if (x < BOARD_SIZE && y < BOARD_SIZE) {
            cells[x][y] = fill;
          }
        }
      }
    }
    return cells;
  }

  renderShipSelect(label: ShipLabel) {
    return html`<mwc-button
      label=${label}
      @click=${() => this.liftShip(label)}
      .disabled=${this.activeShip === label}
    ></mwc-button>`;
  }

  render() {
    return html` <mwc-snackbar id="create-error" leading> </mwc-snackbar>

      <div style="display: flex; flex-direction: column">
        <span style="font-size: 18px">Create Ship Placements</span>
        <game-board
          @cell-click=${this.handleCellClick}
          @cell-hover=${this.handleCellHover}
          .cells=${this.shipsAsCells()}
        ></game-board>
        <div>
          ${this.renderShipSelect('5')} ${this.renderShipSelect('4')}
          ${this.renderShipSelect('3_a')} ${this.renderShipSelect('3_b')}
          ${this.renderShipSelect('2')}
          <mwc-button
            label="Rotate"
            @click=${this.handleHorizontalToggle}
          ></mwc-button>
        </div>
        <mwc-button
          raised
          label="Create Ship Placements"
          .disabled=${!this.isShipDeploymentValid()}
          @click=${() => this.createShipDeployment()}
        ></mwc-button>
      </div>`;
  }
}
