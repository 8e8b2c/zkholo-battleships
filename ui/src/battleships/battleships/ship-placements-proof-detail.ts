import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import {
  EntryHash,
  Record,
  ActionHash,
  AppAgentClient,
  DnaHash,
} from '@holochain/client';
import { consume } from '@lit-labs/context';
import { Task } from '@lit-labs/task';
import { decode } from '@msgpack/msgpack';
import '@material/mwc-circular-progress';
import '@material/mwc-icon-button';
import '@material/mwc-snackbar';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';
import { ShipDeploymentProof } from './types';

@customElement('ship-placements-proof-detail')
export class ShipDeploymentProofDetail extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property({
    hasChanged: (newVal: ActionHash, oldVal: ActionHash) =>
      newVal?.toString() !== oldVal?.toString(),
  })
  shipDeploymentProofHash!: ActionHash;

  _fetchRecord = new Task(
    this,
    ([shipDeploymentProofHash]) =>
      this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_ship_deployment_proof',
        payload: shipDeploymentProofHash,
      }) as Promise<Record | undefined>,
    () => [this.shipDeploymentProofHash]
  );

  firstUpdated() {
    if (this.shipDeploymentProofHash === undefined) {
      throw new Error(
        `The shipDeploymentProofHash property is required for the ship-placements-proof-detail element`
      );
    }
  }

  renderDetail(record: Record) {
    const shipDeploymentProof = decode(
      (record.entry as any).Present.entry
    ) as ShipDeploymentProof;

    return html`
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; flex-direction: row">
          <span style="flex: 1"></span>
        </div>
      </div>
    `;
  }

  renderShipDeploymentProof(maybeRecord: Record | undefined) {
    if (!maybeRecord)
      return html`<span
        >The requested ship placements proof was not found.</span
      >`;

    return this.renderDetail(maybeRecord);
  }

  render() {
    return this._fetchRecord.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: maybeRecord => this.renderShipDeploymentProof(maybeRecord),
      error: (e: any) =>
        html`<span
          >Error fetching the ship placements proof: ${e.data.data}</span
        >`,
    });
  }
}
