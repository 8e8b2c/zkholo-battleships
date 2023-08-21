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
        LinkTypes::Deployment,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_your_ship_deployment_for_invite(
    game_invite_action_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(game_invite_action_hash, LinkTypes::Deployment, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(ActionHash::from(link.target).into(), GetOptions::default()))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let your_pub_key = &agent_info()?.agent_latest_pubkey;
    let mut records: Vec<Record> = records
        .into_iter()
        .flatten()
        .filter(|record| record.action().author() == your_pub_key)
        .collect();
    if records.len() > 1 {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "You have multiple deployments".into()
        )));
    }

    Ok(records.pop())
}
