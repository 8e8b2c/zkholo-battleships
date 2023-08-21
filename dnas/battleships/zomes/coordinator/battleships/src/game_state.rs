use battleships_integrity::{get_game_turn, EntryTypes, GameTurn, Shot};
use hdk::prelude::*;

use crate::{
    game_transcript::{
        get_latest_game_transcript_revision, get_original_game_transcript_hash_for_game_invite,
    },
    get_entry_for_action, get_entry_for_record,
    ship_deployment_proof::get_ship_deployment_proofs_for_invite,
};

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ShotOutcome {
    shot: Shot,
    pending: bool,
    hit: bool,
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct InterpretedTranscript {
    turn: GameTurn,
    shots_aimed_at_home: Vec<ShotOutcome>,
    shots_aimed_at_away: Vec<ShotOutcome>,
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
#[serde(tag = "type")]
pub enum GameState {
    AwaitingHomeDeployment,
    AwaitingAwayDeployment,
    AwaitingBothDeployments,
    GameStarted(InterpretedTranscript),
}

#[hdk_extern]
pub fn get_game_state(game_invite_hash: ActionHash) -> ExternResult<GameState> {
    let game_invite = match get_entry_for_action(&game_invite_hash)? {
        Some(EntryTypes::GameInvite(game_invite)) => game_invite,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "Game invite data not found"
            ))))
        }
    };
    let deployments = get_ship_deployment_proofs_for_invite(game_invite_hash.clone())?;
    match deployments.len() {
        0 => return Ok(GameState::AwaitingBothDeployments),
        1 => {
            let deployer = deployments[0].action().author();
            if deployer == &game_invite.home_player {
                return Ok(GameState::AwaitingAwayDeployment);
            } else if deployer == &game_invite.away_player {
                return Ok(GameState::AwaitingHomeDeployment);
            } else {
                return Err(wasm_error!(WasmErrorInner::Guest(String::from(
                    "Non player has deployed"
                ))));
            }
        }
        2 => {
            // Game can be or has been started
        }
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "Game invite has too many deployments"
            ))))
        }
    }
    let original_game_transcript_hash =
        match get_original_game_transcript_hash_for_game_invite(game_invite_hash)? {
            Some(hash) => hash,
            // Transcript not started - away player opens game
            None => {
                return Ok(GameState::GameStarted(InterpretedTranscript {
                    turn: GameTurn::AwayShot,
                    shots_aimed_at_home: Vec::new(),
                    shots_aimed_at_away: Vec::new(),
                }))
            }
        };
    let game_transcript = match get_latest_game_transcript_revision(original_game_transcript_hash)?
        .map(|record| get_entry_for_record(&record))
    {
        Some(Ok(Some(EntryTypes::GameTranscript(game_transcript)))) => game_transcript,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Game Transcript not found".into()
            )))
        }
    };
    // for proof of
    Ok(GameState::GameStarted {
        turn: get_game_turn(&game_transcript),
    })
}
