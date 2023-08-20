import { CallableCell } from "@holochain/tryorama";
import {
  NewEntryAction,
  ActionHash,
  Record,
  AppBundleSource,
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
  fakeDnaHash,
} from "@holochain/client";

export async function sampleGameInvite(
  cell: CallableCell,
  partialGameInvite = {}
) {
  return {
    ...{
      opponent: await fakeAgentPubKey(),
    },
    ...partialGameInvite,
  };
}

export async function createGameInvite(
  cell: CallableCell,
  gameInvite = undefined
): Promise<Record> {
  return cell.callZome({
    zome_name: "battleships",
    fn_name: "create_game_invite",
    payload: gameInvite || (await sampleGameInvite(cell)),
  });
}

export async function sampleShipDeployment(
  cell: CallableCell,
  partialShipDeployment = {}
) {
  return {
    ...{
      invite: await fakeEntryHash(),
      ships: [10],
    },
    ...partialShipDeployment,
  };
}

export async function createShipDeployment(
  cell: CallableCell,
  shipDeployment = undefined
): Promise<Record> {
  return cell.callZome({
    zome_name: "battleships",
    fn_name: "create_ship_deployment",
    payload: shipDeployment || (await sampleShipDeployment(cell)),
  });
}

export async function sampleShipDeploymentProof(
  cell: CallableCell,
  partialShipDeploymentProof = {}
) {
  return {
    ...{
      private_entry: await fakeEntryHash(),
      commitment: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      proof: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    },
    ...partialShipDeploymentProof,
  };
}

export async function createShipDeploymentProof(
  cell: CallableCell,
  shipDeploymentProof = undefined
): Promise<Record> {
  return cell.callZome({
    zome_name: "battleships",
    fn_name: "create_ship_deployment_proof",
    payload: shipDeploymentProof || (await sampleShipDeploymentProof(cell)),
  });
}
