use battleships_integrity::*;
use hdk::prelude::*;
#[hdk_extern]
pub fn create_ship_deployment(ship_deployment: ShipDeployment) -> ExternResult<Record> {
    let ship_deployment_hash = create_entry(&EntryTypes::ShipDeployment(ship_deployment.clone()))?;
    let record = get(ship_deployment_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from(
            "Could not find the newly created ShipDeployment"
        ))
    ))?;
    create_link(
        ship_deployment.invite,
        ship_deployment_hash,
        LinkTypes::Invites,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_ship_deployment(ship_deployment_hash: ActionHash) -> ExternResult<Option<Record>> {
    get(ship_deployment_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_ship_deployments_for_invite(
    game_invite_action_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let links = get_links(game_invite_action_hash, LinkTypes::Placements, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(ActionHash::from(link.target).into(), GetOptions::default()))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().flatten().collect();
    Ok(records)
}
