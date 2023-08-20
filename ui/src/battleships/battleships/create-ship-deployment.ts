import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import {
  InstalledCell,
  ActionHash,
  Record,
  AgentPubKey,
  EntryHash,
  AppAgentClient,
  DnaHash,
} from '@holochain/client';
import { consume } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-textarea';
import '@material/mwc-snackbar';
import { TextArea } from '@material/mwc-textarea';
import { Snackbar } from '@material/mwc-snackbar';
import { groth16 } from 'snarkjs';

import { clientContext } from '../../contexts';
import { Ship, ShipDeployment, ShipDeploymentProof } from './types';
import './game-board';
import { CellFill } from './game-board';

import circuitWasm from './circuits/create/create_js/create.wasm?url';
import circuitZkey from './circuits/create/create_0001.zkey?url';

@customElement('create-ship-deployment')
export class CreateShipDeployment extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property()
  gameInviteHash!: ActionHash;

  @state()
  ships: {
    '5'?: Ship;
    '4'?: Ship;
    '3_a'?: Ship;
    '3_b'?: Ship;
    '2'?: Ship;
  } = {};

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

  changeShips(e: InputEvent) {
    // const elem = e.target as TextArea;
    // try {
    //   this.ships = JSON.parse(elem.value);
    // } catch (error) {
    //   // eslint-disable-next-line
    //   console.error(error);
    //   this.ships = [];
    // }
    this.ships = [
      { x: 0, y: 0, horizontal: false },
      { x: 1, y: 0, horizontal: false },
      { x: 2, y: 0, horizontal: false },
      { x: 3, y: 0, horizontal: false },
      { x: 4, y: 0, horizontal: false },
    ];
  }

  isShipDeploymentValid() {
    if (this.ships.length !== 5) return false;
    const board = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => false)
    );
    const shipSizes = [5, 4, 3, 3, 2];
    for (let i = 0; i < 5; i += 1) {
      const shipSize = shipSizes[i];
      const ship = this.ships[i];
      for (let j = 0; j < shipSize; j += 1) {
        const { x, y } = ship.horizontal
          ? { x: ship.x + j, y: ship.y }
          : { x: ship.x, y: ship.y + j };
        if (board[x][y]) return false;
        board[x][y] = true;
      }
    }
    return true;
  }

  async provePlacement() {
    const ships = this.ships.map(ship => [
      ship.x.toString(),
      ship.y.toString(),
      ship.horizontal ? '1' : '0',
    ]);
    const inputs = { nonce: '0', ships };
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
      const { proofStr, commitment } = await this.provePlacement();

      const shipDeployment: ShipDeployment = {
        invite: this.gameInviteHash,
        ships: this.ships,
      };
      const privateRecord: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'create_ship_deployment',
        payload: shipDeployment,
      });

      this.dispatchEvent(
        new CustomEvent('ship-placements-created', {
          composed: true,
          bubbles: true,
          detail: {
            shipDeploymentHash: privateRecord.signed_action.hashed.hash,
          },
        })
      );

      const shipDeploymentProof: ShipDeploymentProof = {
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
        new CustomEvent('ship-placements-proof-created', {
          composed: true,
          bubbles: true,
          detail: {
            shipDeploymentProofHash: proofRecord.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        'create-error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error creating the ship placements: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  shipsAsCells() {
    const cells: CellFill[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => 'none')
    );
    const shipSizes = [5, 4, 3, 3, 2];
    for (let i = 0; i < 5; i += 1) {
      const shipSize = shipSizes[i];
      const ship = this.ships[i];
      for (let j = 0; j < shipSize; j += 1) {
        const { x, y } = ship.horizontal
          ? { x: ship.x + j, y: ship.y }
          : { x: ship.x, y: ship.y + j };
        cells[x][y] = 'ship';
      }
    }
    return cells;
  }

  render() {
    return html` <mwc-snackbar id="create-error" leading> </mwc-snackbar>

      <div style="display: flex; flex-direction: column">
        <span style="font-size: 18px">Create Ship Placements</span>
        <game-board .cells=${this.shipsAsCells()}></game-board>
        <mwc-button
          raised
          label="Create Ship Placements"
          .disabled=${!this.isShipDeploymentValid()}
          @click=${() => this.createShipDeployment()}
        ></mwc-button>
      </div>`;
  }
}
