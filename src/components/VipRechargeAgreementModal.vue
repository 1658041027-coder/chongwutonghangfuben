<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VipRechargeAgreementDoc } from '@/lib/agreement/vipRechargeAgreement';

const props = defineProps<{
  modelValue: boolean;
  doc: VipRechargeAgreementDoc | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'agree'): void;
}>();

const canAgree = ref(false);
const sys = typeof uni !== 'undefined' && uni.getSystemInfoSync ? uni.getSystemInfoSync() : null;
const isWide = Boolean(sys && sys.windowWidth >= 768);
const modalWidth = computed(() => (isWide ? 560 : (sys?.windowWidth || 375)));
const modalMaxHeight = computed(() => (isWide ? Math.floor((sys?.windowHeight || 700) * 0.7) : (sys?.windowHeight || 700)));
const HEADER_H = 52;
const FOOTER_H = 72;
const scrollHeight = computed(() => {
  const maxH = isWide ? modalMaxHeight.value : (sys?.windowHeight || 700);
  const h = maxH - HEADER_H - FOOTER_H;
  return h > 120 ? h : 120;
});

watch(
  () => props.modelValue,
  (v) => {
    if (v) canAgree.value = false;
  }
);

const close = () => emit('update:modelValue', false);
const onScrollToLower = () => {
  canAgree.value = true;
};

const onScroll = (e: any) => {
  const detail = e?.detail || {};
  const scrollTop = Number(detail.scrollTop || 0);
  const scrollHeightVal = Number(detail.scrollHeight || 0);
  const clientHeight = Number(detail.clientHeight || 0);

  if (scrollHeightVal > 0 && clientHeight > 0 && scrollHeightVal <= clientHeight + 5) {
    canAgree.value = true;
    return;
  }
  if (scrollHeightVal > 0 && clientHeight > 0 && scrollTop + clientHeight >= scrollHeightVal - 20) {
    canAgree.value = true;
  }
};

const agree = () => {
  if (!canAgree.value) return;
  emit('agree');
  emit('update:modelValue', false);
};
</script>

<template>
  <view v-if="modelValue" class="fixed inset-0 z-[999] flex items-end justify-center">
    <view class="absolute inset-0 bg-black/50" @click="close"></view>
    <view
      class="relative bg-white w-full flex flex-col"
      :style="{
        width: isWide ? modalWidth + 'px' : '100%',
        height: isWide ? 'auto' : '100%',
        maxHeight: isWide ? modalMaxHeight + 'px' : '100%'
      }"
    >
      <view class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <text class="text-base font-bold text-gray-900">{{ doc?.title || '会员充值服务协议' }}</text>
        <text class="text-sm text-gray-500 px-2 py-1" @click="close">关闭</text>
      </view>

      <scroll-view
        scroll-y
        class="px-4 py-3"
        :style="{ height: scrollHeight + 'px', lineHeight: 1.6 }"
        lower-threshold="20"
        @scroll="onScroll"
        @scrolltolower="onScrollToLower"
      >
        <view v-if="doc" class="space-y-3">
          <view class="text-xs text-gray-400">
            <text>版本：{{ doc.version }}</text>
            <text class="ml-3">更新日期：{{ doc.updatedAt }}</text>
          </view>
          <view v-for="s in doc.sections" :key="s.title" class="space-y-1">
            <text class="text-[14px] font-bold text-gray-900 block">{{ s.title }}</text>
            <text class="text-[14px] text-gray-700 block leading-relaxed">{{ s.content }}</text>
          </view>
        </view>
        <view v-else class="py-10 text-center">
          <text class="text-sm text-gray-500">加载中...</text>
        </view>
        <view class="h-6"></view>
      </scroll-view>

      <view class="px-4 py-3 border-t border-gray-100 bg-white pb-safe">
        <button
          class="w-full rounded-full py-3 font-bold border-none"
          :class="canAgree ? 'bg-[#0066FF] text-white' : 'bg-gray-200 text-gray-500'"
          @click="agree"
        >
          我已阅读并同意
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
