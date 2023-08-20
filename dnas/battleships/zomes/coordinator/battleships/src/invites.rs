use battleships_integrity::*;
use hdk::prelude::*;
#[hdk_extern]
pub fn get_invites(participant: AgentPubKey) -> ExternResult<Vec<Record>> {
    let links = get_links(participant, LinkTypes::Invites, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(ActionHash::from(link.target).into(), GetOptions::default()))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().flatten().collect();
    Ok(records)
}
