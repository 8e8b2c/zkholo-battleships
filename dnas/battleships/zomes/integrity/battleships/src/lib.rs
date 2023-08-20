pub mod ship_deployment_proof;
pub use ship_deployment_proof::*;
pub mod ship_deployment;
pub use ship_deployment::*;
pub mod game_invite;
mod groth16;
pub use game_invite::*;
use hdi::prelude::*;
#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    GameInvite(GameInvite),
    #[entry_def(visibility = "private")]
    ShipDeployment(ShipDeployment),
    ShipDeploymentProof(ShipDeploymentProof),
}
#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    Invites,
    Placements,
    Game,
}
#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_agent_joining(
    _agent_pub_key: AgentPubKey,
    _membrane_proof: &Option<MembraneProof>,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::GameInvite(game_invite) => {
                    validate_create_game_invite(EntryCreationAction::Create(action), game_invite)
                }
                EntryTypes::ShipDeployment(ship_deployment) => validate_create_ship_deployment(
                    EntryCreationAction::Create(action),
                    ship_deployment,
                ),
                EntryTypes::ShipDeploymentProof(ship_deployment_proof) => {
                    validate_create_ship_deployment_proof(
                        EntryCreationAction::Create(action),
                        ship_deployment_proof,
                    )
                }
            },
            OpEntry::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::GameInvite(game_invite) => {
                    validate_create_game_invite(EntryCreationAction::Update(action), game_invite)
                }
                EntryTypes::ShipDeployment(ship_deployment) => validate_create_ship_deployment(
                    EntryCreationAction::Update(action),
                    ship_deployment,
                ),
                EntryTypes::ShipDeploymentProof(ship_deployment_proof) => {
                    validate_create_ship_deployment_proof(
                        EntryCreationAction::Update(action),
                        ship_deployment_proof,
                    )
                }
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterUpdate(update_entry) => match update_entry {
            OpUpdate::Entry {
                original_action,
                original_app_entry,
                app_entry,
                action,
            } => match (app_entry, original_app_entry) {
                (
                    EntryTypes::ShipDeploymentProof(ship_deployment_proof),
                    EntryTypes::ShipDeploymentProof(original_ship_deployment_proof),
                ) => validate_update_ship_deployment_proof(
                    action,
                    ship_deployment_proof,
                    original_action,
                    original_ship_deployment_proof,
                ),
                (
                    EntryTypes::ShipDeployment(ship_deployment),
                    EntryTypes::ShipDeployment(original_ship_deployment),
                ) => validate_update_ship_deployment(
                    action,
                    ship_deployment,
                    original_action,
                    original_ship_deployment,
                ),
                (
                    EntryTypes::GameInvite(game_invite),
                    EntryTypes::GameInvite(original_game_invite),
                ) => validate_update_game_invite(
                    action,
                    game_invite,
                    original_action,
                    original_game_invite,
                ),
                _ => Ok(ValidateCallbackResult::Invalid(
                    "Original and updated entry types must be the same".to_string(),
                )),
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterDelete(delete_entry) => match delete_entry {
            OpDelete::Entry {
                original_action,
                original_app_entry,
                action,
            } => match original_app_entry {
                EntryTypes::GameInvite(game_invite) => {
                    validate_delete_game_invite(action, original_action, game_invite)
                }
                EntryTypes::ShipDeployment(ship_deployment) => {
                    validate_delete_ship_deployment(action, original_action, ship_deployment)
                }
                EntryTypes::ShipDeploymentProof(ship_deployment_proof) => {
                    validate_delete_ship_deployment_proof(
                        action,
                        original_action,
                        ship_deployment_proof,
                    )
                }
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterCreateLink {
            link_type,
            base_address,
            target_address,
            tag,
            action,
        } => match link_type {
            LinkTypes::Invites => {
                validate_create_link_invites(action, base_address, target_address, tag)
            }
            LinkTypes::Game => validate_create_link_game(action, base_address, target_address, tag),
            LinkTypes::Placements => {
                validate_create_link_placement(action, base_address, target_address, tag)
            }
        },
        FlatOp::RegisterDeleteLink { .. } => Ok(ValidateCallbackResult::Invalid(String::from(
            "Links cannot be deleted",
        ))),
        FlatOp::StoreRecord(store_record) => match store_record {
            OpRecord::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::GameInvite(game_invite) => {
                    validate_create_game_invite(EntryCreationAction::Create(action), game_invite)
                }
                EntryTypes::ShipDeployment(ship_deployment) => validate_create_ship_deployment(
                    EntryCreationAction::Create(action),
                    ship_deployment,
                ),
                EntryTypes::ShipDeploymentProof(ship_deployment_proof) => {
                    validate_create_ship_deployment_proof(
                        EntryCreationAction::Create(action),
                        ship_deployment_proof,
                    )
                }
            },
            OpRecord::UpdateEntry {
                original_action_hash,
                app_entry,
                action,
                ..
            } => {
                let original_record = must_get_valid_record(original_action_hash)?;
                let original_action = original_record.action().clone();
                let original_action = match original_action {
                    Action::Create(create) => EntryCreationAction::Create(create),
                    Action::Update(update) => EntryCreationAction::Update(update),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original action for an update must be a Create or Update action"
                                .to_string(),
                        ));
                    }
                };
                match app_entry {
                    EntryTypes::GameInvite(game_invite) => {
                        let result = validate_create_game_invite(
                            EntryCreationAction::Update(action.clone()),
                            game_invite.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_game_invite: Option<GameInvite> = original_record
                                .entry()
                                .to_app_option()
                                .map_err(|e| wasm_error!(e))?;
                            let original_game_invite = match original_game_invite {
                                Some(game_invite) => game_invite,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_game_invite(
                                action,
                                game_invite,
                                original_action,
                                original_game_invite,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::ShipDeployment(ship_deployment) => {
                        let result = validate_create_ship_deployment(
                            EntryCreationAction::Update(action.clone()),
                            ship_deployment.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_ship_deployment: Option<ShipDeployment> = original_record
                                .entry()
                                .to_app_option()
                                .map_err(|e| wasm_error!(e))?;
                            let original_ship_deployment = match original_ship_deployment {
                                Some(ship_deployment) => ship_deployment,
                                None => {
                                    return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                }
                            };
                            validate_update_ship_deployment(
                                action,
                                ship_deployment,
                                original_action,
                                original_ship_deployment,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                    EntryTypes::ShipDeploymentProof(ship_deployment_proof) => {
                        let result = validate_create_ship_deployment_proof(
                            EntryCreationAction::Update(action.clone()),
                            ship_deployment_proof.clone(),
                        )?;
                        if let ValidateCallbackResult::Valid = result {
                            let original_ship_deployment_proof: Option<ShipDeploymentProof> =
                                original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                            let original_ship_deployment_proof =
                                match original_ship_deployment_proof {
                                    Some(ship_deployment_proof) => ship_deployment_proof,
                                    None => {
                                        return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                    }
                                };
                            validate_update_ship_deployment_proof(
                                action,
                                ship_deployment_proof,
                                original_action,
                                original_ship_deployment_proof,
                            )
                        } else {
                            Ok(result)
                        }
                    }
                }
            }
            OpRecord::DeleteEntry {
                original_action_hash,
                action,
                ..
            } => {
                let original_record = must_get_valid_record(original_action_hash)?;
                let original_action = original_record.action().clone();
                let original_action = match original_action {
                    Action::Create(create) => EntryCreationAction::Create(create),
                    Action::Update(update) => EntryCreationAction::Update(update),
                    _ => {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original action for a delete must be a Create or Update action"
                                .to_string(),
                        ));
                    }
                };
                let app_entry_type = match original_action.entry_type() {
                    EntryType::App(app_entry_type) => app_entry_type,
                    _ => {
                        return Ok(ValidateCallbackResult::Valid);
                    }
                };
                let entry = match original_record.entry().as_option() {
                    Some(entry) => entry,
                    None => {
                        if original_action.entry_type().visibility().is_public() {
                            return Ok(
                                    ValidateCallbackResult::Invalid(
                                        "Original record for a delete of a public entry must contain an entry"
                                            .to_string(),
                                    ),
                                );
                        } else {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    }
                };
                let original_app_entry = match EntryTypes::deserialize_from_type(
                    app_entry_type.zome_index,
                    app_entry_type.entry_index,
                    entry,
                )? {
                    Some(app_entry) => app_entry,
                    None => {
                        return Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original app entry must be one of the defined entry types for this zome"
                                        .to_string(),
                                ),
                            );
                    }
                };
                match original_app_entry {
                    EntryTypes::GameInvite(original_game_invite) => {
                        validate_delete_game_invite(action, original_action, original_game_invite)
                    }
                    EntryTypes::ShipDeployment(original_ship_deployment) => {
                        validate_delete_ship_deployment(
                            action,
                            original_action,
                            original_ship_deployment,
                        )
                    }
                    EntryTypes::ShipDeploymentProof(original_ship_deployment_proof) => {
                        validate_delete_ship_deployment_proof(
                            action,
                            original_action,
                            original_ship_deployment_proof,
                        )
                    }
                }
            }
            OpRecord::CreateLink {
                base_address,
                target_address,
                tag,
                link_type,
                action,
            } => match link_type {
                LinkTypes::Invites => {
                    validate_create_link_invites(action, base_address, target_address, tag)
                }
                LinkTypes::Game => {
                    validate_create_link_game(action, base_address, target_address, tag)
                }
                LinkTypes::Placements => {
                    validate_create_link_placement(action, base_address, target_address, tag)
                }
            },
            OpRecord::DeleteLink { .. } => Ok(ValidateCallbackResult::Invalid(
                "Links cannot be deleted".to_string(),
            )),
            OpRecord::CreatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::Dna { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::OpenChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CloseChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::InitZomesComplete { .. } => Ok(ValidateCallbackResult::Valid),
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterAgentActivity(agent_activity) => match agent_activity {
            OpActivity::CreateAgent { agent, action } => {
                let previous_action = must_get_action(action.prev_action)?;
                match previous_action.action() {
                        Action::AgentValidationPkg(
                            AgentValidationPkg { membrane_proof, .. },
                        ) => validate_agent_joining(agent, membrane_proof),
                        _ => {
                            Ok(
                                ValidateCallbackResult::Invalid(
                                    "The previous action for a `CreateAgent` action must be an `AgentValidationPkg`"
                                        .to_string(),
                                ),
                            )
                        }
                    }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
    }
}
