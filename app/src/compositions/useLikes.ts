import { Ref } from 'vue';
import { ModDto } from '../../../shared/dto/ModDto';

export const useLikes = (mod: Ref<ModDto>) => {
  const onToggleLike = (isLiked: boolean) => {
    console.log('onToggleLike', isLiked, mod.value?.likeCount);
    if (mod.value) {
      if (isLiked) {
        mod.value.likeCount = mod.value.likeCount ? mod.value.likeCount++ : 1;
      } else {
        mod.value.likeCount = mod.value.likeCount ? mod.value.likeCount-- : 0;
      }
    }
  };

  return {
    onToggleLike,
  };
};

