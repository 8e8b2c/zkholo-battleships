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
    create_link(
        ship_deployment_proof.invite,
        ship_deployment_proof_hash,
        LinkTypes::DeploymentProofs,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_ship_deployment_proof(
    ship_deployment_proof_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    get(ship_deployment_proof_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_ship_deployment_proofs_for_invite(
    game_invite_action_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let links = get_links(game_invite_action_hash, LinkTypes::DeploymentProofs, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(ActionHash::from(link.target).into(), GetOptions::default()))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().flatten().collect();
    Ok(records)
}
