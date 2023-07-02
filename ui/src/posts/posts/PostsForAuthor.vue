<template>
  <div v-if="loading" style="display: flex; flex: 1; align-items: center; justify-content: center">
    <mwc-circular-progress indeterminate></mwc-circular-progress>
  </div>

  <div v-else style="display: flex; flex-direction: column">
    <span v-if="error">Error fetching the posts: {{error.data.data}}.</span>
    <div v-else-if="hashes && hashes.length > 0" style="margin-bottom: 8px">
      <PostDetail 
        v-for="hash in hashes" 
        :post-hash="hash" 
      ></PostDetail>
    </div>
    <span v-else>No posts found for this author.</span>
  </div>


</template>

<script lang="ts">
import { defineComponent, toRaw, inject, ComputedRef } from 'vue';
import { decode } from '@msgpack/msgpack';
import { AppAgentClient, Record, AgentPubKey, EntryHash, ActionHash, NewEntryAction } from '@holochain/client';
import '@material/mwc-circular-progress';
import PostDetail from './PostDetail.vue';
import { PostsSignal } from './types';

export default defineComponent({
  components: {
    PostDetail
  },
  props: {
    author: {
      type: Object,
      required: true
    }
  },
  data(): { hashes: Array<ActionHash> | undefined; loading: boolean; error: any } {
    return {
      hashes: undefined,
      loading: true,
      error: undefined
    }
  },
  async mounted() {
    if (this.author === undefined) {
      throw new Error(`The author input is required for the PostsForAuthor element`);
    }

    try {
      const records: Array<Record> = await this.client.callZome({
        cap_secret: null,
        role_name: 'posts',
        zome_name: 'posts',
        fn_name: 'get_posts_for_author',
        payload: this.author,
      });
      this.hashes = records.map(r => r.signed_action.hashed.hash);
    } catch (e) {
      this.error = e;
    }
    this.loading = false;
    
    toRaw(this.client).on('signal', signal => {
      if (signal.zome_name !== 'posts') return; 
      const payload = signal.payload as PostsSignal;
      if (payload.type !== 'LinkCreated') return;
      if (payload.link_type !== 'AuthorToPosts') return;

      if (this.hashes) this.hashes.push(payload.action.hashed.content.target_address);
    });
  },
  setup() {
    const client = (inject('client') as ComputedRef<AppAgentClient>).value;
    return {
      client,
    };
  },
})
</script>
