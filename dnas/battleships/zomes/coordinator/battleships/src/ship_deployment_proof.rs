use battleships_integrity::*;
use hdk::prelude::*;
#[hdk_extern]
pub fn create_ship_deployment_proof(
    ship_deployment_proof: ShipDeploymentProof,
) -> ExternResult<Record> {
    let ship_deployment_proof_hash = create_entry(&EntryTypes::ShipDeploymentProof(
        ship_deployment_proof.clone(),
    ))?;
    let record = get(ship_deployment_proof_hash.clone(), GetOptions::default())?.ok_or(
        wasm_error!(WasmErrorInner::Guest(String::from(
            "Could not find the newly created ShipDeploymentProof"
        ))),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_ship_deployment_proof(
    ship_deployment_proof_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    get(ship_deployment_proof_hash, GetOptions::default())
}
