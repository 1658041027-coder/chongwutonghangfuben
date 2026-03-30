<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUser } from '../../composables/useUser';
import { Users, Copy } from 'lucide-vue-next';
import { db } from '../../lib/cloud';

const { user } = useUser();

const groups = ref<any[]>([]);

const fetchGroups = async () => {
  try {
    uni.showLoading({ title: '加载中...' });
    const { data } = await db.collection('wechat_groups').get();
    groups.value = data;
  } catch (error) {
    console.error('获取群组失败', error);
    // 即使失败也尽量不阻断用户，或者显示空状态
  } finally {
    uni.hideLoading();
  }
};

onShow(() => {
  fetchGroups();
});

const copyWechat = (wechat: string) => {
  uni.setClipboardData({
    data: wechat,
    success: () => {
      uni.showToast({
        title: '微信号已复制',
        icon: 'success'
      });
    }
  });
};

const goToVip = () => {
  uni.navigateTo({ url: '/pages/vip/vip' });
};
</script>

<template>
  <view class="bg-gray-50 min-h-screen pb-20">
    <view class="p-4 space-y-4">
      <!-- VIP Check: Only show content if user is VIP -->
      <template v-if="user?.is_vip">
         <view v-for="group in groups" :key="group.id" class="bg-white p-4 rounded-xl shadow-sm flex items-start space-x-4 mb-4 border border-gray-100">
            <view class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Users class="text-green-500" :size="24" />
            </view>
            <view class="flex-1">
              <view class="mb-3">
                <text class="font-bold text-gray-800 text-lg block mb-1">{{ group.name }}</text>
                <text class="text-sm text-gray-500 block">{{ group.desc }}</text>
              </view>
              
              <view class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                <view class="text-sm text-gray-600 flex items-center">
                  <text class="opacity-80">群主微信:</text>
                  <text class="font-bold text-gray-800 ml-2 select-text">{{ group.owner }}</text>
                </view>
                <button 
                  @click="copyWechat(group.owner)" 
                  class="text-xs bg-white border border-gray-200 px-4 py-1.5 rounded-full text-primary flex items-center space-x-1 m-0 leading-normal shadow-sm active:bg-gray-50"
                >
                  <Copy :size="14" />
                  <text>复制</text>
                </button>
              </view>
            </view>
         </view>
      </template>

      <!-- Non-VIP State -->
      <template v-else>
         <view class="bg-white rounded-xl p-8 text-center shadow-sm">
            <view class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Users class="text-gray-400" :size="32" />
            </view>
            <text class="text-lg font-bold text-gray-800 block mb-2">会员专属权益</text>
            <text class="text-sm text-gray-500 block mb-6">查看微信群需要开通会员权限</text>
            
            <button 
              @click="goToVip" 
              class="bg-yellow-400 text-gray-900 font-bold py-2 px-8 rounded-full text-sm inline-block w-auto"
            >
              立即开通会员
            </button>
         </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
.text-primary {
  color: #FF6B35;
}
</style>
