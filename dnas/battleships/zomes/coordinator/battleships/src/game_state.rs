use battleships_integrity::EntryTypes;
use hdk::prelude::*;

use crate::{get_entry_for_record, ship_deployment::get_ship_deployments_for_invite};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum GameState {
    AwaitingDeployment(AgentPubKey),
    AwaitingBothDeployments,
    GameStarted,
    Other,
}

#[hdk_extern]
pub fn get_game_state(game_invite_hash: ActionHash) -> ExternResult<GameState> {
    let record = match get(game_invite_hash, GetOptions::default())? {
        Some(record) => record,
        None => {
            return Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "Game invite not found"
            ))))
        }
    };
    let game_invite_action_hash = record.action_hashed().hash.clone();
    let game_invite = match get_entry_for_record(&record)? {
        Some(EntryTypes::GameInvite(game_invite)) => game_invite,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "Game invite data not found"
            ))))
        }
    };
    let home_player = record.action_hashed().author();
    let away_player = &game_invite.opponent;
    let deployments = get_ship_deployments_for_invite(game_invite_action_hash)?;
    match deployments.len() {
        0 => return Ok(GameState::AwaitingBothDeployments),
        1 => {
            let deployer = deployments[0].action().author();
            if deployer == home_player {
                return Ok(GameState::AwaitingDeployment(away_player.clone()));
            } else if deployer == away_player {
                return Ok(GameState::AwaitingDeployment(home_player.clone()));
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
    // if deployments.len() > 2 {
    //     return wasm_error!(WasmErrorInner::Guest(String::from(
    //         "Game invite has too many deployments"
    //     )));
    // }
    // let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    // let you_are_home = match &my_agent_pub_key {
    //     &home_player => true,
    //     &away_player => false,
    //     _=> return wasm_error!(WasmErrorInner::Guest(String::from(
    //         "You are not part of this game"
    //     )))
    // }
    // let roles = deployments
    //     .iter()
    //     .map(|record| match record.action_hashed().author() {
    //         &my_agent_pub_key => Role::You,
    //         _ => Role::Unknown,
    //     });
    Ok(GameState::Other)
}
