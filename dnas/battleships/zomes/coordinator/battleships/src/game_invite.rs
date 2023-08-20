use battleships_integrity::*;
use hdk::prelude::*;

#[hdk_extern]
pub fn create_game_invite(game_invite: GameInvite) -> ExternResult<Record> {
    let game_invite_hash = create_entry(&EntryTypes::GameInvite(game_invite.clone()))?;
    let record = get(game_invite_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created GameInvite"))
    ))?;
    let opponent_agent_pub_key = game_invite.opponent;
    create_link(
        opponent_agent_pub_key,
        game_invite_hash.clone(),
        LinkTypes::Invites,
        (),
    )?;
    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(my_agent_pub_key, game_invite_hash, LinkTypes::Invites, ())?;
    Ok(record)
}
#[hdk_extern]
pub fn get_game_invite(game_invite_hash: ActionHash) -> ExternResult<Option<Record>> {
    get(game_invite_hash, GetOptions::default())
}
