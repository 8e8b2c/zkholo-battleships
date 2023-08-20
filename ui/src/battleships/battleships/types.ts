import {
  Record,
  ActionHash,
  DnaHash,
  SignedActionHashed,
  EntryHash,
  AgentPubKey,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink,
} from '@holochain/client';

export type BattleshipsSignal =
  | {
      type: 'EntryCreated';
      action: SignedActionHashed<Create>;
      app_entry: EntryTypes;
    }
  | {
      type: 'EntryUpdated';
      action: SignedActionHashed<Update>;
      app_entry: EntryTypes;
      original_app_entry: EntryTypes;
    }
  | {
      type: 'EntryDeleted';
      action: SignedActionHashed<Delete>;
      original_app_entry: EntryTypes;
    }
  | {
      type: 'LinkCreated';
      action: SignedActionHashed<CreateLink>;
      link_type: string;
    }
  | {
      type: 'LinkDeleted';
      action: SignedActionHashed<DeleteLink>;
      link_type: string;
    };

export type EntryTypes =
  | ({ type: 'ShipDeploymentProof' } & ShipDeploymentProof)
  | ({ type: 'ShipDeployment' } & ShipDeployment)
  | ({ type: 'GameInvite' } & GameInvite);

export interface GameInvite {
  opponent: AgentPubKey;
}

export interface Ship {
  x: number;
  y: number;
  horizontal: boolean;
}

export interface ShipDeployment {
  invite: EntryHash;

  ships: Ship[];
}

export interface ShipDeploymentProof {
  private_entry: EntryHash;

  commitment: string;

  proof: string;
}

export type GameState =
  | { type: 'AwaitingBothDeployments' }
  | { type: 'AwaitingDeployment' }
  | { type: 'GameStarted' }
  | { type: 'Other' };
