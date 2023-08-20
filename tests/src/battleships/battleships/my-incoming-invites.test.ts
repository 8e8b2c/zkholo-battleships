import { assert, test } from "vitest";

import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createGameInvite } from './common.js';

test('create a GameInvite and get my incoming invites', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/battleships.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Bob gets my incoming invites
    let collectionOutput: Record[] = await bob.cells[0].callZome({
      zome_name: "battleships",
      fn_name: "get_my_incoming_invites",
      payload: alice.agentPubKey
    });
    assert.equal(collectionOutput.length, 0);

    // Alice creates a GameInvite
    const createdRecord: Record = await createGameInvite(alice.cells[0]);
    assert.ok(createdRecord);
    
    await pause(1200);
    
    // Bob gets my incoming invites again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "battleships",
      fn_name: "get_my_incoming_invites",
      payload: alice.agentPubKey
    });
    assert.equal(collectionOutput.length, 1);
    assert.deepEqual(createdRecord, collectionOutput[0]);    
  });
});

