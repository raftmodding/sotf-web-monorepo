<template>
  <div class="container">
    <mod-details v-if="mod" :mod="mod" @like="onToggleLike" />
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';
import { useActiveMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import { ModDto } from '../../../shared/dto/ModDto';
import ModDetails from '../components/ModDetails.vue';
import { useLikes } from '../compositions/useLikes';
import { api } from '../modules/api';
import { toaster } from '../modules/toaster';

//@ts-ignore
const { VITE_META_BANNER } = import.meta.env;

export default defineComponent({
  name: 'ModPage',
  components: {
    ModDetails,
  },
  setup() {
    const mod= ref<ModDto>();
    const meta = useActiveMeta();

    (async () => {
      const route = useRoute();
      const router = useRouter();
      mod.value = await api.getMod(route.params.id as string);

      if (!mod.value) {
        const modId = route.params.id;
        await router.replace({ name: 'mods' });
        toaster.error(`Mod ${modId} not found`);
      }

      meta.title = mod.value?.title;
      meta.description = mod.value?.description;
      meta.og.image = mod.value?.bannerImageUrl || VITE_META_BANNER;
    })();

    return {
      mod,
      ...useLikes(mod as Ref<ModDto>),
    };
  },
});
</script>