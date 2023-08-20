import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import {
  AppAgentClient,
  AgentPubKey,
  EntryHash,
  ActionHash,
  Record,
  NewEntryAction,
  encodeHashToBase64,
} from '@holochain/client';
import { consume } from '@lit-labs/context';
import { Task } from '@lit-labs/task';
import '@material/mwc-circular-progress';
import '@material/mwc-list';

import { clientContext } from '../../contexts';
import { BattleshipsSignal } from './types';

import './game-invite-detail';
import './invite-list-item';

@customElement('invite-list')
export class InviteList extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property({
    hasChanged: (newVal: AgentPubKey, oldVal: AgentPubKey) =>
      newVal?.toString() !== oldVal?.toString(),
  })
  recipient!: AgentPubKey;

  @state()
  signaledHashes: Array<ActionHash> = [];

  _fetchGameInvites = new Task(
    this,
    ([recipient]) =>
      this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_invites',
        payload: recipient,
      }) as Promise<Array<Record>>,
    () => [this.recipient]
  );

  firstUpdated() {
    if (this.recipient === undefined) {
      throw new Error(
        `The recipient property is required for the invite-list element`
      );
    }

    this.client.on('signal', signal => {
      // eslint-disable-next-line
      console.log(signal);
      if (signal.zome_name !== 'battleships') return;
      const payload = signal.payload as BattleshipsSignal;
      if (payload.type !== 'EntryCreated') return;
      if (payload.app_entry.type !== 'GameInvite') return;
      if (this.recipient.toString() !== this.client.myPubKey.toString()) return;
      this.signaledHashes = [
        payload.action.hashed.hash,
        ...this.signaledHashes,
      ];
    });

    setInterval(() => {
      this._fetchGameInvites.run();
    }, 5_000);
  }

  handleItemClick(inviteHash: ActionHash) {
    // eslint-disable-next-line
    console.log('item click');
    this.dispatchEvent(
      new CustomEvent('invite-select', {
        detail: { inviteHash },
        bubbles: true,
        composed: true,
      })
    );
  }

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>No game invites found for this recipient.</span>`;

    return html`
      <mwc-list>
        ${hashes.map(
          hash =>
            html`<invite-list-item
              @click=${() => this.handleItemClick(hash)}
              .gameInviteHash=${hash}
            ></invite-list-item>`

          // html`<game-invite-detail
          //   .gameInviteHash=${hash}
          //   style="margin-bottom: 16px;"
          //   @game-invite-deleted=${() => {
          //     this._fetchGameInvites.run();
          //     this.signaledHashes = [];
          //   }}
          // ></game-invite-detail>`
        )}
      </mwc-list>
    `;
  }

  render() {
    return this._fetchGameInvites.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: records =>
        this.renderList(
          mergeHashes(
            this.signaledHashes,
            records.map(r => r.signed_action.hashed.hash)
          )
        ),
      error: (e: any) =>
        html`<span>Error fetching the game invites: ${e.data.data}.</span>`,
    });
  }
}

function mergeHashes(xs: Uint8Array[], ys: Uint8Array[]) {
  const merged = [...xs];
  for (const y of ys) {
    if (!xs.some(x => uint8ArrayEqual(x, y))) {
      merged.push(y);
    }
  }
  return merged;
}

function uint8ArrayEqual(x: Uint8Array, y: Uint8Array) {
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i += 1) {
    if (x[i] !== y[i]) return false;
  }
  return true;
}
