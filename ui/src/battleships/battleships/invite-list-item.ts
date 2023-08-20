import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  Record,
  ActionHash,
  AppAgentClient,
  encodeHashToBase64,
} from '@holochain/client';
import { consume } from '@lit-labs/context';
import { Task } from '@lit-labs/task';
import { decode } from '@msgpack/msgpack';
import '@material/mwc-circular-progress';
import '@material/mwc-list';

import { clientContext } from '../../contexts';
import { GameInvite } from './types';
import './create-ship-deployment';

@customElement('invite-list-item')
export class InviteListItem extends LitElement {
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
        `The gameInviteHash property is required for the invite-list-item element`
      );
    }
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('gameInviteHash')) {
      // this.retriesStarted = false;
      // this.retriesRemaining = 3;
    }
  }

  // checkFetchStatus() {
  //   if
  // }

  // retriesStarted = false
  // retriesRemaining = 3
  // kickRetry() {
  //   if(this.retriesStarted)return
  //   this.retriesStarted = true;
  //   this._fetchRecord.
  // }

  renderDetail(record: Record) {
    const _gameInvite = decode(
      (record.entry as any).Present.entry
    ) as GameInvite;

    return html` <mwc-list-item>A Game</mwc-list-item> `;
  }

  renderGameInvite(maybeRecord: Record | undefined) {
    if (!maybeRecord) return html`<mwc-list-item>Not found</mwc-list-item> `;

    return this.renderDetail(maybeRecord);
  }

  render() {
    return this._fetchRecord.render({
      pending: () =>
        html`<mwc-list-item headline="Loading..."></mwc-list-item>`,
      complete: maybeRecord => this.renderGameInvite(maybeRecord),
      error: (e: any) =>
        html`<span>Error fetching the game invite: ${e.data.data}</span>`,
    });
  }
}
