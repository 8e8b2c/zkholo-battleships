use hdi::prelude::*;

use crate::{constants::BOARD_SIZE, helpers::must_get_valid_app_entry_and_author, EntryTypes};
#[derive(Clone, PartialEq, Serialize, Deserialize, SerializedBytes, Debug)]
pub struct Shot {
    pub x: usize,
    pub y: usize,
}
#[derive(Clone, PartialEq, Serialize, Deserialize, SerializedBytes, Debug)]
pub struct ShotOutcome {
    pub proof_hash: ActionHash,
    pub hit: bool,
}
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GameTranscript {
    pub invite: ActionHash,
    pub home_player_deployment_proof: ActionHash,
    pub away_player_deployment_proof: ActionHash,
    pub home_player_shots: Vec<Shot>,
    pub away_player_shots: Vec<Shot>,
    pub home_player_hit_or_miss_proofs: Vec<ShotOutcome>,
    pub away_player_hit_or_miss_proofs: Vec<ShotOutcome>,
}
pub fn validate_create_game_transcript(
    action: EntryCreationAction,
    game_transcript: GameTranscript,
) -> ExternResult<ValidateCallbackResult> {
    if matches!(action, EntryCreationAction::Update(..)) {
        // No meaningful validation can be done until we have the original entry, therefore we
        // succeed to allow other validation to kick in down the road.
        return Ok(ValidateCallbackResult::Valid);
    }
    if !game_transcript.home_player_shots.is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Cannot start transcript with home shots fired".into(),
        ));
    }
    if game_transcript.away_player_shots.len() != 1 {
        return Ok(ValidateCallbackResult::Invalid(
            "Away player should open game with first shot".into(),
        ));
    }
    if !shot_is_on_board(&game_transcript.away_player_shots[0]) {
        return Ok(ValidateCallbackResult::Invalid(
            "First shot out of bounds".into(),
        ));
    }
    if !game_transcript.home_player_hit_or_miss_proofs.is_empty()
        || !game_transcript.away_player_hit_or_miss_proofs.is_empty()
    {
        return Ok(ValidateCallbackResult::Invalid(
            "Cannot start game with Hit Or Miss Proofs prefilled".into(),
        ));
    }

    let game_invite = match must_get_valid_app_entry_and_author(game_transcript.invite)? {
        (EntryTypes::GameInvite(game_invite), _) => game_invite,
        _ => {
            return Ok(ValidateCallbackResult::Invalid(
                "invite field is wrong type".into(),
            ))
        }
    };
    if &game_invite.away_player != action.author() {
        return Ok(ValidateCallbackResult::Invalid(
            "Away player must start game and take first shot".into(),
        ));
    }

    match must_get_valid_app_entry_and_author(game_transcript.home_player_deployment_proof)? {
        (EntryTypes::ShipDeploymentProof(_), author) => {
            if author != game_invite.home_player {
                return Ok(ValidateCallbackResult::Invalid(
                    "Home player deployment doesn't match".into(),
                ));
            }
        }
        _ => {
            return Ok(ValidateCallbackResult::Invalid(
                "home_player_deployment_proof field is wrong type".into(),
            ));
        }
    }

    match must_get_valid_app_entry_and_author(game_transcript.away_player_deployment_proof)? {
        (EntryTypes::ShipDeploymentProof(_), author) => {
            if author != game_invite.away_player {
                return Ok(ValidateCallbackResult::Invalid(
                    "Away player deployment doesn't match".into(),
                ));
            }
        }
        _ => {
            return Ok(ValidateCallbackResult::Invalid(
                "away_player_deployment_proof field is wrong type".into(),
            ));
        }
    }

    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_game_transcript(
    action: Update,
    game_transcript: GameTranscript,
    _original_action: EntryCreationAction,
    original_game_transcript: GameTranscript,
) -> ExternResult<ValidateCallbackResult> {
    let game_invite = match must_get_valid_app_entry_and_author(game_transcript.invite.clone())? {
        // Note that we don't bother trying to check whether the invite has been tampered here
        // because that in effect happens anyway at the end of validate_add_shot and
        // validate_add_proof via the full equality check.
        (EntryTypes::GameInvite(game_invite), _) => game_invite,
        _ => {
            return Ok(ValidateCallbackResult::Invalid(
                "invite field is wrong type".into(),
            ))
        }
    };
    match get_game_turn(&original_game_transcript) {
        GameTurn::AwayShot => {
            // All lists are the same length therefore we're at the beginning of the cycle.
            // Step 1 - Away player should be adding a shot
            if action.author != game_invite.away_player {
                return Ok(ValidateCallbackResult::Invalid("Away player's turn".into()));
            }
            validate_add_shot(game_transcript, original_game_transcript, false)
        }
        GameTurn::HomeProof => {
            // Step 2 - Home player should be adding a proof
            if action.author != game_invite.home_player {
                return Ok(ValidateCallbackResult::Invalid("Home player's turn".into()));
            }
            validate_add_proof(
                game_transcript,
                original_game_transcript,
                action.author,
                true,
            )
        }
        GameTurn::HomeShot => {
            // Step 3 - Home player should be adding a shot
            if action.author != game_invite.home_player {
                return Ok(ValidateCallbackResult::Invalid("Home player's turn".into()));
            }
            validate_add_shot(game_transcript, original_game_transcript, true)
        }
        GameTurn::AwayProof => {
            // Step 4 - Away player should be adding a proof
            if action.author != game_invite.away_player {
                return Ok(ValidateCallbackResult::Invalid("Away player's turn".into()));
            }
            validate_add_proof(
                game_transcript,
                original_game_transcript,
                action.author,
                false,
            )
        }
        GameTurn::Corrupt => {
            // This should never happen. If it does that means a corrupt state previously made it
            // through validation.
            Ok(ValidateCallbackResult::Invalid(
                "Original is corrupt".into(),
            ))
        }
    }
}

pub fn validate_delete_game_transcript(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_game_transcript: GameTranscript,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Game Transcripts cannot be deleted",
    )))
}

fn shot_is_on_board(shot: &Shot) -> bool {
    shot.x < BOARD_SIZE && shot.y < BOARD_SIZE
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
#[serde(tag = "type")]
pub enum GameTurn {
    AwayShot,
    HomeProof,
    HomeShot,
    AwayProof,
    Corrupt,
}

pub fn get_game_turn(game_transcript: &GameTranscript) -> GameTurn {
    // Infer who's turn it should be
    // Sequence of permitted steps is:
    // 1. away fires shot (included in create too)
    // 2. home adds hit/miss proof
    // 3. home fires shot
    // 4. away adds hit/miss proof
    // 5. repeat steps 1-4 until game ends (17 hits made by one player)
    // Therefore the step (1-4) can be inferred from shot & proof vec lengths
    let away_shot_len = game_transcript.away_player_shots.len();
    let home_proof_len = game_transcript.home_player_hit_or_miss_proofs.len();
    let home_shot_len = game_transcript.home_player_shots.len();
    let away_proof_len = game_transcript.away_player_hit_or_miss_proofs.len();
    let baseline = std::cmp::min(
        std::cmp::min(home_shot_len, away_shot_len),
        std::cmp::min(home_proof_len, away_proof_len),
    );
    match (
        away_shot_len - baseline,
        home_proof_len - baseline,
        home_shot_len - baseline,
        away_proof_len - baseline,
    ) {
        // All lists are the same length therefore we're at the beginning of the cycle.
        (0, 0, 0, 0) => GameTurn::AwayShot,
        (1, 0, 0, 0) => GameTurn::HomeProof,
        (1, 1, 0, 0) => GameTurn::HomeShot,
        (1, 1, 1, 0) => GameTurn::AwayProof,
        // This should never happen
        _ => GameTurn::Corrupt,
    }
}

fn additional_shot_is_valid(existing_shots: &[Shot], shot: &Shot) -> bool {
    shot_is_on_board(shot) && !existing_shots.contains(shot)
}

fn validate_add_shot(
    mut game_transcript: GameTranscript,
    original_game_transcript: GameTranscript,
    is_by_home_player: bool,
) -> ExternResult<ValidateCallbackResult> {
    // After isolating the additional shot the transcripts should be identical
    let changed_shots = if is_by_home_player {
        &mut game_transcript.home_player_shots
    } else {
        &mut game_transcript.away_player_shots
    };
    let shot = match changed_shots.pop() {
        Some(shot) => shot,
        None => {
            return Ok(ValidateCallbackResult::Invalid(
                "Away player shot not found".into(),
            ))
        }
    };
    if !additional_shot_is_valid(changed_shots, &shot) {
        return Ok(ValidateCallbackResult::Invalid("Invalid shot".into()));
    }
    if game_transcript != original_game_transcript {
        return Ok(ValidateCallbackResult::Invalid(format!(
            "Only acceptable difference is additional {} player shot",
            if is_by_home_player { "home" } else { "away" }
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}

fn validate_add_proof(
    mut game_transcript: GameTranscript,
    original_game_transcript: GameTranscript,
    author: AgentPubKey,
    is_by_home_player: bool,
) -> ExternResult<ValidateCallbackResult> {
    let changed_proofs = if is_by_home_player {
        &mut game_transcript.home_player_hit_or_miss_proofs
    } else {
        &mut game_transcript.away_player_hit_or_miss_proofs
    };
    let shot_outcome = match changed_proofs.pop() {
        Some(shot_outcome) => shot_outcome,
        None => {
            return Ok(ValidateCallbackResult::Invalid(
                "Home player proof not found".into(),
            ))
        }
    };
    let (hit_or_miss_proof, proof_author) =
        match must_get_valid_app_entry_and_author(shot_outcome.proof_hash)? {
            (EntryTypes::HitOrMissProof(hit_or_miss_proof), proof_author) => {
                (hit_or_miss_proof, proof_author)
            }
            _ => {
                return Ok(ValidateCallbackResult::Invalid(
                    "Provided hash is not for a Hit Or Miss Proof".into(),
                ))
            }
        };
    if shot_outcome.hit != hit_or_miss_proof.hit {
        return Ok(ValidateCallbackResult::Invalid(
            "Shot outcome inconsistent with proof".into(),
        ));
    }
    if proof_author != author {
        return Ok(ValidateCallbackResult::Invalid(
            "Provided proof is by a different author".into(),
        ));
    }
    let expected_deployment_proof = if is_by_home_player {
        &game_transcript.home_player_deployment_proof
    } else {
        &game_transcript.away_player_deployment_proof
    };
    // We don't interrogate whether the deployment commitment matches here since that will have
    // been done during proof creation validation. Therefore it is sufficient to test shallowly.
    if &hit_or_miss_proof.deployment_proof != expected_deployment_proof {
        return Ok(ValidateCallbackResult::Invalid(
            "Provided proof is for a different deployment".into(),
        ));
    }
    let opponent_shots = if is_by_home_player {
        &game_transcript.away_player_shots
    } else {
        &game_transcript.home_player_shots
    };
    if &hit_or_miss_proof.shot
        != opponent_shots
            .last()
            .expect("player_shots count is baseline + 1")
    {
        return Ok(ValidateCallbackResult::Invalid(
            "Provided proof is for a different shot".into(),
        ));
    }
    if game_transcript != original_game_transcript {
        return Ok(ValidateCallbackResult::Invalid(format!(
            "Only acceptable difference is additional {} player proof",
            if is_by_home_player { "home" } else { "away" }
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_game_transcript_updates(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::from(base_address);
    let record = must_get_valid_record(action_hash)?;
    let _game_transcript: crate::GameTranscript = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    let action_hash = ActionHash::from(target_address);
    let record = must_get_valid_record(action_hash)?;
    let _game_transcript: crate::GameTranscript = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    // TODO: should we also validate the diff between the original record and ones that came between?
    Ok(ValidateCallbackResult::Valid)
}
