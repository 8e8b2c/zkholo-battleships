use hdi::prelude::*;
#[derive(Clone, PartialEq, Serialize, Deserialize, SerializedBytes, Debug)]
pub struct Ship {
    pub x: usize,
    pub y: usize,
    pub horizontal: bool,
}
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ShipDeployment {
    pub ships: Vec<Ship>,
}
pub fn validate_create_ship_deployment(
    _action: EntryCreationAction,
    ship_deployment: ShipDeployment,
) -> ExternResult<ValidateCallbackResult> {
    if ship_deployment.ships.len() != 5 {
        return Ok(ValidateCallbackResult::Invalid(
            "Deployment must have 5 ships".into(),
        ));
    }
    let mut occupied_squares = [[false; 10]; 10];
    let ship_lengths: [usize; 5] = [5, 4, 3, 3, 2];
    for (ship, ship_length) in ship_deployment.ships.iter().zip(ship_lengths) {
        for i in 0..ship_length {
            let (x, y) = if ship.horizontal {
                (ship.x + i, ship.y)
            } else {
                (ship.x, ship.y + i)
            };
            if occupied_squares[x][y] {
                return Ok(ValidateCallbackResult::Invalid(
                    "Ship deployment collision".into(),
                ));
            }
            occupied_squares[x][y] = true;
        }
    }
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_ship_deployment(
    _action: Update,
    _ship_deployment: ShipDeployment,
    _original_action: EntryCreationAction,
    _original_ship_deployment: ShipDeployment,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Ship Placements cannot be updated",
    )))
}
pub fn validate_delete_ship_deployment(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_ship_deployment: ShipDeployment,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Ship Placements cannot be deleted",
    )))
}
