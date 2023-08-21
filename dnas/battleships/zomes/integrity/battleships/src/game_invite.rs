use hdi::prelude::*;
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GameInvite {
    pub home_player: AgentPubKey,
    pub away_player: AgentPubKey,
}
pub fn validate_create_game_invite(
    action: EntryCreationAction,
    game_invite: GameInvite,
) -> ExternResult<ValidateCallbackResult> {
    if &game_invite.home_player != action.author() {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Home player must be author",
        )));
    }
    if &game_invite.away_player == action.author() {
        return Ok(ValidateCallbackResult::Invalid(String::from(
            "Away player cannot be author",
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_game_invite(
    _action: Update,
    _game_invite: GameInvite,
    _original_action: EntryCreationAction,
    _original_game_invite: GameInvite,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Game Invites cannot be updated",
    )))
}
pub fn validate_delete_game_invite(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_game_invite: GameInvite,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Game Invites cannot be deleted",
    )))
}
pub fn validate_create_link_invites(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::from(target_address);
    let record = must_get_valid_record(action_hash)?;
    let _game_invite: crate::GameInvite = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_game(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::from(target_address);
    let record = must_get_valid_record(action_hash)?;
    let _game_invite: crate::GameInvite = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_deployment(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::from(target_address);
    let _record = must_get_valid_record(action_hash)?;
    // Private entry can't be validated by peers
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_deployment_proof(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::from(target_address);
    let record = must_get_valid_record(action_hash)?;
    let _ship_deployment_proof: crate::ShipDeploymentProof = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}
