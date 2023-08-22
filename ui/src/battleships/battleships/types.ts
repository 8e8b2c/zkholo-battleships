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
  home_player: AgentPubKey;
  away_player: AgentPubKey;
}

export interface Ship {
  x: number;
  y: number;
  horizontal: boolean;
}

export interface ShipDeployment {
  invite: ActionHash;
  ships: Ship[];
  salt: string;
}

export interface ShipDeploymentProof {
  invite: ActionHash;
  private_entry: ActionHash;

  commitment: string;

  proof: string;
}

export type GameTurn =
  | { type: 'AwayShot' }
  | { type: 'HomeProof' }
  | { type: 'HomeShot' }
  | { type: 'AwayProof' };

export type GameState =
  | { type: 'AwaitingBothDeployments' }
  | { type: 'AwaitingHomeDeployment' }
  | { type: 'AwaitingAwayDeployment' }
  | { type: 'GameStarted'; turn: GameTurn };

export type ViewerRole = 'home' | 'away' | 'spectator' | 'unknown';

export interface FireShotInput {
  game_invite_hash: ActionHash;
  shot: Shot;
}

export interface Shot {
  x: number;
  y: number;
}

export interface ShotOutcome {
  shot: Shot;
  hit: boolean;
  pending: boolean;
}

export interface GameTranscript {
  invite: ActionHash;
  home_player_deployment_proof: ActionHash;
  away_player_deployment_proof: ActionHash;
  home_player_shots: Shot[];
  away_player_shots: Shot[];
  home_player_hit_or_miss_proofs: ShotOutcome[];
  away_player_hit_or_miss_proofs: ShotOutcome[];
}

export interface HitOrMissProof {
  deployment_proof: ActionHash;
  deployment_commitment: String;
  shot: Shot;
  hit: boolean;
  proof: String;
}

export interface ProveHitOrMissInput {
  game_invite_hash: ActionHash;
  hit_or_miss_proof: HitOrMissProof;
}
