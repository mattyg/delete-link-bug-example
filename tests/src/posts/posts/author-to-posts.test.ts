import { assert, test } from "vitest";

import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createPost } from './common.js';

test('link a Author to a Post', async () => {
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

    const baseAddress = alice.agentPubKey;
    const targetRecord = await createPost(alice.namedCells.get('posts'));
    const targetAddress = targetRecord.signed_action.hashed.hash;

    // Bob gets the links, should be empty
    let linksOutput: Record[] = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_posts_for_author",
      payload: baseAddress
    });
    assert.equal(linksOutput.length, 0);

    // Alice creates a link from Author to Post
    await alice.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "add_post_for_author",
      payload: {
        base_author: baseAddress,
        target_post_hash: targetAddress
      }
    });
    
    await pause(1200);
    
    // Bob gets the links again
    linksOutput = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_posts_for_author",
      payload: baseAddress
    });
    assert.equal(linksOutput.length, 1);
    assert.deepEqual(targetRecord, linksOutput[0]);


    await alice.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "remove_post_for_author",
      payload: {
        base_author: baseAddress,
        target_post_hash: targetAddress
      }
    });
    
    await pause(1200);

    // Bob gets the links again
    linksOutput = await bob.namedCells.get('posts').callZome({
      zome_name: "posts",
      fn_name: "get_posts_for_author",
      payload: baseAddress
    });
    assert.equal(linksOutput.length, 0);


  });
});


