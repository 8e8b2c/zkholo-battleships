use hdi::prelude::*;

use crate::EntryTypes;

pub fn must_get_valid_app_entry_and_author(
    action_hash: ActionHash,
) -> ExternResult<(EntryTypes, AgentPubKey)> {
    let record = must_get_valid_record(action_hash)?;
    let author = record.action().author().clone();
    match get_entry_for_record(&record)? {
        Some(app_entry) => Ok((app_entry, author)),
        None => Err(wasm_error!(WasmErrorInner::Guest(
            "Could not deserialise entry".into()
        ))),
    }
}

pub fn get_entry_for_record(record: &Record) -> ExternResult<Option<EntryTypes>> {
    let entry = match record.entry().as_option() {
        Some(entry) => entry,
        None => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Entry not present".into(),
            )))
        }
    };
    let (zome_index, entry_index) = match record.action().entry_type() {
        Some(EntryType::App(AppEntryDef {
            zome_index,
            entry_index,
            ..
        })) => (zome_index, entry_index),
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Not an app entry type".into(),
            )))
        }
    };
    EntryTypes::deserialize_from_type(*zome_index, *entry_index, entry)
}
