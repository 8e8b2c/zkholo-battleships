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
import { ShipDeployment } from './types';

@customElement('ship-placements-detail')
export class ShipDeploymentDetail extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property({
    hasChanged: (newVal: ActionHash, oldVal: ActionHash) =>
      newVal?.toString() !== oldVal?.toString(),
  })
  shipDeploymentHash!: ActionHash;

  _fetchRecord = new Task(
    this,
    ([shipDeploymentHash]) =>
      this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_ship_deployment',
        payload: shipDeploymentHash,
      }) as Promise<Record | undefined>,
    () => [this.shipDeploymentHash]
  );

  firstUpdated() {
    if (this.shipDeploymentHash === undefined) {
      throw new Error(
        `The shipDeploymentHash property is required for the ship-placements-detail element`
      );
    }
  }

  renderDetail(record: Record) {
    const shipDeployment = decode(
      (record.entry as any).Present.entry
    ) as ShipDeployment;

    return html`
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; flex-direction: row">
          <span style="flex: 1"></span>
        </div>
      </div>
    `;
  }

  renderShipDeployment(maybeRecord: Record | undefined) {
    if (!maybeRecord)
      return html`<span>The requested ship placements was not found.</span>`;

    return this.renderDetail(maybeRecord);
  }

  render() {
    return this._fetchRecord.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: maybeRecord => this.renderShipDeployment(maybeRecord),
      error: (e: any) =>
        html`<span>Error fetching the ship placements: ${e.data.data}</span>`,
    });
  }
}
