use hdi::prelude::*;

use crate::groth16::verify;
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ShipDeploymentProof {
    pub invite: ActionHash,
    pub private_entry: ActionHash,
    pub commitment: String,
    pub proof: String,
}

const VERIFICATION_KEY_JSON: &str =
    include_str!("../../../../../../circuits/build/create/verification_key.json");

pub fn validate_create_ship_deployment_proof(
    _action: EntryCreationAction,
    ship_deployment_proof: ShipDeploymentProof,
) -> ExternResult<ValidateCallbackResult> {
    if verify(
        VERIFICATION_KEY_JSON,
        ship_deployment_proof.proof.as_str(),
        &[ship_deployment_proof.commitment.as_str()],
    )? {
        Ok(ValidateCallbackResult::Valid)
    } else {
        Ok(ValidateCallbackResult::Invalid(
            "Invalid ship placement proof".into(),
        ))
    }
}
pub fn validate_update_ship_deployment_proof(
    _action: Update,
    _ship_deployment_proof: ShipDeploymentProof,
    _original_action: EntryCreationAction,
    _original_ship_deployment_proof: ShipDeploymentProof,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Ship Placements Proofs cannot be updated",
    )))
}
pub fn validate_delete_ship_deployment_proof(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_ship_deployment_proof: ShipDeploymentProof,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Ship Placements Proofs cannot be deleted",
    )))
}
