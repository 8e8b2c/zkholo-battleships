import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AppAgentClient, encodeHashToBase64 } from '@holochain/client';
import { consume } from '@lit-labs/context';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { Snackbar } from '@material/mwc-snackbar';
import { Dialog } from '@material/mwc-dialog';

import { clientContext } from '../../contexts';
import './create-game-invite';

@customElement('new-game-dialog')
export class NewGameDialog extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  async copyHash(hashStr: string) {
    await navigator.clipboard.writeText(hashStr);
    const snackbar = this.shadowRoot?.getElementById('snackbar') as Snackbar;
    snackbar.show();
  }

  show() {
    const dialog = this.shadowRoot?.getElementById('dialog') as Dialog;
    dialog.show();
  }

  render() {
    const hashStr = encodeHashToBase64(this.client.myPubKey);
    const shortHashStr = hashStr.substring(0, 10);
    return html`
      <mwc-snackbar
        id="snackbar"
        leading
        labelText="Copied your public key to clipboard"
      ></mwc-snackbar>
      <mwc-dialog id="dialog">
        Invite somebody to play using their agent public key.
        <create-game-invite></create-game-invite>
        Alternatively, give your opponent your public key so they can invite
        you.
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px">Your agent pub key:</span>
          <span style="font-family: monospace;">${shortHashStr}...</span>
          <mwc-icon-button
            icon="content_copy"
            @click=${() => this.copyHash(hashStr)}
          ></mwc-icon-button>
        </div>
      </mwc-dialog>
    `;
  }
}
