import { assert, test } from "vitest";

import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeDnaHash, fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createPost, samplePost } from './common.js';

test('create Post', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/delete-link-bug-example.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a Post
    const record: Record = await createPost(alice.namedCells.get('posts'));
    assert.ok(record);
  });
});

test('create and read Post', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/delete-link-bug-example.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const sample = await samplePost(alice.namedCells.get('posts'));

    // Alice creates a Post
    const record: Record = await createPost(alice.namedCells.get('posts'), sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await pause(1200);

    // Bob gets the created Post
    const createReadOutput: Record = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_post",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(sample, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test('create and update Post', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/delete-link-bug-example.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a Post
    const record: Record = await createPost(alice.namedCells.get('posts'));
    assert.ok(record);
        
    const originalActionHash = record.signed_action.hashed.hash;
 
    // Alice updates the Post
    let contentUpdate: any = await samplePost(alice.namedCells.get('posts'));
    let updateInput = {
      original_post_hash: originalActionHash,
      previous_post_hash: originalActionHash,
      updated_post: contentUpdate,
    };

    let updatedRecord: Record = await alice.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "update_post",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await pause(1200);
        
    // Bob gets the updated Post
    const readUpdatedOutput0: Record = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_post",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);

    // Alice updates the Post again
    contentUpdate = await samplePost(alice.namedCells.get('posts'));
    updateInput = { 
      original_post_hash: originalActionHash,
      previous_post_hash: updatedRecord.signed_action.hashed.hash,
      updated_post: contentUpdate,
    };

    updatedRecord = await alice.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "update_post",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await pause(1200);
        
    // Bob gets the updated Post
    const readUpdatedOutput1: Record = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_post",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);
  });
});

test('create and delete Post', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/delete-link-bug-example.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a Post
    const record: Record = await createPost(alice.namedCells.get('posts'));
    assert.ok(record);
        
    // Alice deletes the Post
    const deleteActionHash = await alice.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "delete_post",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);

    // Wait for the entry deletion to be propagated to the other node.
    await pause(1200);
        
    // Bob tries to get the deleted Post
    const readDeletedOutput = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_post",
      payload: record.signed_action.hashed.hash,
    });
    assert.notOk(readDeletedOutput);
  });
});
