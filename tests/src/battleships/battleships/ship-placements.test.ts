import { assert, test } from "vitest";

import { runScenario, pause, CallableCell } from "@holochain/tryorama";
import {
  NewEntryAction,
  ActionHash,
  Record,
  AppBundleSource,
  fakeDnaHash,
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";

import { createShipDeployment, sampleShipDeployment } from "./common.js";

test("create ShipDeployment", async () => {
  await runScenario(async (scenario) => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + "/../workdir/battleships.happ";

    // Set up the app to be installed
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a ShipDeployment
    const record: Record = await createShipDeployment(alice.cells[0]);
    assert.ok(record);
  });
});

test("create and read ShipDeployment", async () => {
  await runScenario(async (scenario) => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + "/../workdir/battleships.happ";

    // Set up the app to be installed
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const sample = await sampleShipDeployment(alice.cells[0]);

    // Alice creates a ShipDeployment
    const record: Record = await createShipDeployment(alice.cells[0], sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await pause(1200);

    // Bob gets the created ShipDeployment
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "battleships",
      fn_name: "get_ship_deployment",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(
      sample,
      decode((createReadOutput.entry as any).Present.entry) as any
    );
  });
});
