use battleships_integrity::*;
use hdk::prelude::*;

use crate::{
    get_entry_for_action, get_entry_for_record,
    ship_deployment_proof::get_ship_deployment_proofs_for_invite,
};

#[hdk_extern]
pub fn create_game_transcript(game_transcript: GameTranscript) -> ExternResult<Record> {
    let game_transcript_hash = create_entry(&EntryTypes::GameTranscript(game_transcript.clone()))?;
    let record = get(game_transcript_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from(
            "Could not find the newly created GameTranscript"
        ))
    ))?;
    create_link(
        game_transcript.invite,
        game_transcript_hash,
        LinkTypes::GameTranscript,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_original_game_transcript_hash_for_game_invite(
    game_invite_hash: ActionHash,
) -> ExternResult<Option<ActionHash>> {
    let mut links = get_links(game_invite_hash, LinkTypes::GameTranscript, None)?;
    Ok(links.pop().map(|link| ActionHash::from(link.target)))
}

#[hdk_extern]
pub fn get_latest_game_transcript_revision(
    original_game_transcript_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        original_game_transcript_hash.clone(),
        LinkTypes::GameTranscriptUpdates,
        None,
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_game_transcript_hash = match latest_link {
        Some(link) => ActionHash::from(link.target),
        None => original_game_transcript_hash,
    };
    get(latest_game_transcript_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_game_transcript_for_game_invite(
    game_invite_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    match get_original_game_transcript_hash_for_game_invite(game_invite_hash)? {
        Some(original_hash) => get_latest_game_transcript_revision(original_hash),
        None => Ok(None),
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FireShotInput {
    game_invite_hash: ActionHash,
    shot: Shot,
}

#[hdk_extern]
pub fn fire_shot(input: FireShotInput) -> ExternResult<Record> {
    match get_original_game_transcript_hash_for_game_invite(input.game_invite_hash.clone())? {
        None => fire_first_shot(input),
        Some(original_game_transcript_hash) => fire_next_shot(input, original_game_transcript_hash),
    }
}

fn fire_first_shot(input: FireShotInput) -> ExternResult<Record> {
    let GameInvite {
        home_player,
        away_player,
        ..
    } = match get_entry_for_action(&input.game_invite_hash)? {
        Some(EntryTypes::GameInvite(game_invite)) => game_invite,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Game invite not found".into()
            )))
        }
    };
    let deployment_proofs = get_ship_deployment_proofs_for_invite(input.game_invite_hash.clone())?;
    if deployment_proofs.len() != 2 {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "Expect 2 exisiting deployment proofs".into()
        )));
    }
    let author0 = deployment_proofs[0].action().author();
    let author1 = deployment_proofs[1].action().author();
    let (home_player_deployment_proof, away_player_deployment_proof) =
        if author0 == &home_player && author1 == &away_player {
            (
                deployment_proofs[0].action_hashed().hash.clone(),
                deployment_proofs[1].action_hashed().hash.clone(),
            )
        } else if author0 == &away_player && author1 == &home_player {
            (
                deployment_proofs[1].action_hashed().hash.clone(),
                deployment_proofs[0].action_hashed().hash.clone(),
            )
        } else {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Linked deployment proofs don't match players".into()
            )));
        };
    let game_transcript = GameTranscript {
        invite: input.game_invite_hash.clone(),
        home_player_deployment_proof,
        away_player_deployment_proof,
        home_player_shots: Vec::new(),
        away_player_shots: vec![input.shot],
        home_player_hit_or_miss_proofs: Vec::new(),
        away_player_hit_or_miss_proofs: Vec::new(),
    };
    create_game_transcript(game_transcript)
}

fn fire_next_shot(
    input: FireShotInput,
    original_game_transcript_hash: ActionHash,
) -> ExternResult<Record> {
    let game_transcript_record = get_latest_game_transcript_revision(
        original_game_transcript_hash.clone(),
    )?
    .ok_or(wasm_error!(WasmErrorInner::Guest(
        "GameTranscript Record not found".into()
    )))?;

    let mut game_transcript = match get_entry_for_record(&game_transcript_record)? {
        Some(EntryTypes::GameTranscript(transcript)) => transcript,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Transcript not found".into()
            )))
        }
    };
    let game_turn = get_game_turn(&game_transcript);
    debug!("{:?}", &game_turn);
    match game_turn {
        GameTurn::HomeShot => game_transcript.home_player_shots.push(input.shot),
        GameTurn::AwayShot => game_transcript.away_player_shots.push(input.shot),
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Wrong time to fire shot".into()
            )))
        }
    }

    let updated_game_transcript_hash = update_entry(
        game_transcript_record.action_hashed().hash.clone(),
        &game_transcript,
    )?;

    create_link(
        original_game_transcript_hash,
        updated_game_transcript_hash.clone(),
        LinkTypes::GameTranscriptUpdates,
        (),
    )?;
    let record = get(updated_game_transcript_hash, GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from(
            "Could not find the newly updated GameTranscript"
        ))
    ))?;
    Ok(record)
}
