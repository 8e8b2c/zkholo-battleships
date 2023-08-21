use hdi::prelude::*;

use crate::{groth16::verify, helpers::must_get_valid_app_entry_and_author, EntryTypes, Shot};
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct HitOrMissProof {
    pub deployment_proof: ActionHash,
    pub deployment_commitment: String,
    pub shot: Shot,
    pub hit: bool,
    pub proof: String,
}

const VERIFICATION_KEY_JSON: &str =
    include_str!("../../../../../../circuits/build/move/verification_key.json");

pub fn validate_create_hit_or_miss_proof(
    _action: EntryCreationAction,
    hit_or_miss_proof: HitOrMissProof,
) -> ExternResult<ValidateCallbackResult> {
    match must_get_valid_app_entry_and_author(hit_or_miss_proof.deployment_proof)? {
        (EntryTypes::ShipDeploymentProof(deployment_proof), _) => {
            if deployment_proof.commitment != hit_or_miss_proof.deployment_commitment {
                return Ok(ValidateCallbackResult::Invalid(
                    "Deployment commitment doesn't match".into(),
                ));
            }
        }
        _ => {
            return Ok(ValidateCallbackResult::Invalid(
                "deployment_proof field is not a ShipDeploymentProof".into(),
            ))
        }
    }
    if !verify(
        VERIFICATION_KEY_JSON,
        hit_or_miss_proof.proof.as_str(),
        &[
            if hit_or_miss_proof.hit { "1" } else { "0" },
            hit_or_miss_proof.deployment_commitment.as_str(),
            hit_or_miss_proof.shot.x.to_string().as_str(),
            hit_or_miss_proof.shot.y.to_string().as_str(),
        ],
    )? {
        return Ok(ValidateCallbackResult::Invalid(
            "Invalid Hit Or Miss Proof".into(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_hit_or_miss_proof(
    _action: Update,
    _hit_or_miss_proof: HitOrMissProof,
    _original_action: EntryCreationAction,
    _original_hit_or_miss_proof: HitOrMissProof,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Hit Or Miss Proofs cannot be updated",
    )))
}
pub fn validate_delete_hit_or_miss_proof(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_hit_or_miss_proof: HitOrMissProof,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Hit Or Miss Proofs cannot be deleted",
    )))
}
