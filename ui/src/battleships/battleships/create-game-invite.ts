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
  decodeHashFromBase64,
} from '@holochain/client';
import { consume } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-snackbar';
import '@material/mwc-textfield';
import { TextField } from '@material/mwc-textfield';
import { Snackbar } from '@material/mwc-snackbar';

import { clientContext } from '../../contexts';
import { GameInvite } from './types';

@customElement('create-game-invite')
export class CreateGameInvite extends LitElement {
  @consume({ context: clientContext })
  client!: AppAgentClient;

  @state()
  opponent: AgentPubKey | undefined;

  @state()
  isSubmitting = false;

  isGameInviteValid() {
    return !!this.opponent;
  }

  changeOpponent(event: InputEvent) {
    const elem = event.target as TextField;
    try {
      this.opponent = decodeHashFromBase64(elem.value);
    } catch {
      this.opponent = undefined;
    }
  }

  async createGameInvite() {
    if (!this.opponent) {
      throw new Error('opponent not set');
    }
    this.isSubmitting = true;
    const gameInvite: GameInvite = {
      home_player: this.client.myPubKey,
      away_player: this.opponent,
    };

    try {
      const record: Record = await this.client.callZome({
        cap_secret: null,
        role_name: 'battleships',
        zome_name: 'battleships',
        fn_name: 'create_game_invite',
        payload: gameInvite,
      });

      this.dispatchEvent(
        new CustomEvent('game-invite-created', {
          composed: true,
          bubbles: true,
          detail: {
            gameInviteHash: record.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        'create-error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error creating the game invite: ${e.data.data}`;
      errorSnackbar.show();
    }
    this.isSubmitting = false;
  }

  render() {
    return html` <mwc-snackbar id="create-error" leading> </mwc-snackbar>

      <div style="display: flex; flex-direction: column">
        <mwc-textfield
          label="Opponent"
          @change=${this.changeOpponent}
        ></mwc-textfield>
        <mwc-button
          raised
          label="Create Game Invite"
          .disabled=${!this.isGameInviteValid() || this.isSubmitting}
          @click=${() => this.createGameInvite()}
        ></mwc-button>
      </div>`;
  }
}
