<template>
  <section class="my-3" ref="head">
    <div class="row">
      <div class="col-sm-9">
        <h1 class="text-break">{{ mod.title }}</h1>
        <p>{{ mod.description }}</p>
      </div>
      <div class="col-sm-3">
        <div class="row mt-5">
          <div class="col-6 text-center px-1">
            <icon
              name="heart"
              :type="isLiked ? 's' : 'r'"
              size="lg"
              class="like-button"
              :class="{ active: isLiked }"
              @click="toggleLike"
            />
            <br />
            <small class="d-inline-block">
              <span id="likes-counter">{{ mod.likeCount || 0 }}</span> Likes
            </small>
          </div>
          <div class="col-6 text-center px-1">
            <icon name="download" size="lg" /><br />
            <small class="d-inline-block">{{ totalDownloads }} Downloads</small>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { head } from 'lodash';
import { defineComponent, PropType, Ref, ref } from 'vue';
import { ModDto } from '../../../shared/dto/ModDto';
import { useMod } from '../compositions/useMod';
import { api } from '../modules/api';
import { toaster } from '../modules/toaster';
import { isSessionExpired } from '../store/actions/session.actions';
import { state } from '../store/store';
import Icon from './Icon.vue';

export default defineComponent({
  name: 'ModHeader',
  components: {
    Icon,
  },
  props: {
    mod: {
      type: Object as PropType<ModDto>,
      required: true,
    },
    preview: Boolean,
  },
  emits: ['like'],
  setup(props) {
    const disabled: Ref<boolean> = ref(false);
    const timer: Ref<number> = ref(0);

    return {
      ...props,
      ...useMod(props),
      timer,
      disabled,
    };
  },
  computed: {
    isLiked(): boolean {
      return state.likes.includes(this.mod.id);
    },
  },
  methods: {
    async toggleLike() {
      if (this.preview) {
        toaster.success(
          'Nice try 😁<br/><b>Finish creating your mod first.</b>',
        );
        return;
      }

      if (isSessionExpired()) {
        toaster.error(`You have to login to like a mod `);
        this.$router.push({
          name: 'signIn',
          query: {
            redirect: String(this.$route.name),
            paramsStr: JSON.stringify(this.$route.params),
          },
        });
        return;
      }

      if (this.disabled) {
        toaster.error(
          `Please wait ${this.timer / 1000}s before using this feature again`,
        );
        return;
      }

      if (!this.isLiked) {
        if (await api.likeMod(this.mod.id)) {
          this.$emit('like', true);
          toaster.success(`You liked <b>${this.mod.title}</b>`);
        }
      } else {
        if (await api.unlikeMod(this.mod.id)) {
          this.$emit('like', false);
          toaster.success(`You <u>no longer</u> like <b>${this.mod.title}</b>`);
        }
      }

      this.disabled = true;
      this.timer = 5000;
      const interval = setInterval(() => (this.timer -= 1000), 1000);
      setTimeout(() => {
        this.disabled = false;
        this.timer = 0;
        clearInterval(interval);
      }, 5000);
    },
  },
});
</script>

<style scoped lang="scss">
.like-button {
  transition: transform 1s linear, color 1s linear;
  cursor: pointer;
  font-size: 1.5rem;

  &:hover {
    color: #e74c3c;
    transform: scale(1.4, 1.4);
  }

  &.active {
    color: #e74c3c;
    animation-name: beating-heart;
    animation-duration: 750ms;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
}
</style>
