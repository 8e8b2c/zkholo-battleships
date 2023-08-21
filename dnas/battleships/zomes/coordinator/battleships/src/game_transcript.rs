use battleships_integrity::*;
use hdk::prelude::*;

#[hdk_extern]
pub fn create_game_transcript(game_transcript: GameTranscript) -> ExternResult<Record> {
    let game_transcript_hash = create_entry(&EntryTypes::GameTranscript(game_transcript.clone()))?;
    let record = get(game_transcript_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from(
            "Could not find the newly created GameTranscript"
        ))
    ))?;
    create_link(
        game_transcript.invite,
        game_transcript_hash,
        LinkTypes::GameTranscript,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_original_game_transcript_hash_for_game_invite(
    game_invite_hash: ActionHash,
) -> ExternResult<Option<ActionHash>> {
    let links = get_links(game_invite_action_hash, LinkTypes::GameTranscript, None)?;
    Ok(links.pop().map(|link| link.target))
}

#[hdk_extern]
pub fn get_latest_game_transcript(
    original_game_transcript_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        original_game_transcript_hash,
        LinkTypes::GameTranscriptUpdates,
        None,
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_game_transcript_hash = match latest_link {
        Some(link) => ActionHash::from(link.target.clone()),
        None => original_todo_item_hash.clone(),
    };
    get(latest_game_transcript_hash, GetOptions::default())
}
