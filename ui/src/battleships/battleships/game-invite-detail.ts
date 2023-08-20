import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import {
  EntryHash,
  Record,
  ActionHash,
  AppAgentClient,
  DnaHash,
  encodeHashToBase64,
} from '@holochain/client';
import { consume } from '@lit-labs/context';
import { Task } from '@lit-labs/task';
import { decode } from '@msgpack/msgpack';
import '@material/mwc-circular-progress';
import '@material/mwc-icon-button';
import '@material/mwc-snackbar';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';
import { GameInvite } from './types';
import './create-ship-deployment';

@customElement('game-invite-detail')
export class GameInviteDetail extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @property({
    hasChanged: (newVal: ActionHash, oldVal: ActionHash) =>
      newVal?.toString() !== oldVal?.toString(),
  })
  gameInviteHash!: ActionHash;

  _fetchRecord = new Task(
    this,
    ([gameInviteHash]) =>
      this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'get_game_invite',
        payload: gameInviteHash,
      }) as Promise<Record | undefined>,
    () => [this.gameInviteHash]
  );

  firstUpdated() {
    if (this.gameInviteHash === undefined) {
      throw new Error(
        `The gameInviteHash property is required for the game-invite-detail element`
      );
    }
  }

  renderDetail(record: Record) {
    const gameInvite = decode(
      (record.entry as any).Present.entry
    ) as GameInvite;

    const opponentStr = encodeHashToBase64(gameInvite.opponent);
    const opponentShort = opponentStr.substring(0, 10);

    return html`
      <div style="display: flex; flex-direction: column">
        Opponent: ${opponentShort}...
        <create-ship-placements
          .invite=${record.signed_action.hashed.hash}
        ></create-ship-placements>
      </div>
    `;
  }

  renderGameInvite(maybeRecord: Record | undefined) {
    if (!maybeRecord)
      return html`<span>The requested game invite was not found.</span>`;

    return this.renderDetail(maybeRecord);
  }

  render() {
    return this._fetchRecord.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: maybeRecord => this.renderGameInvite(maybeRecord),
      error: (e: any) =>
        html`<span>Error fetching the game invite: ${e.data.data}</span>`,
    });
  }
}
