<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from "@dcloudio/uni-app";
import { db } from '../../lib/cloud';
import { useUser } from '../../composables/useUser';

const resources = ref<any[]>([]);
const loading = ref(true);
const { user } = useUser();

const fetchMyPublished = async () => {
  loading.value = true;
  // Try to get user from composable first, then storage
  let userId = user.value?._id;
  if (!userId) {
     userId = uni.getStorageSync('pet_user_id');
  }
  
  if (!userId) {
    resources.value = [];
    loading.value = false;
    return;
  }

  const { data } = await db.collection('resources')
    .where({
      user_id: userId
    })
    .orderBy('created_at', 'desc')
    .get();

  resources.value = data || [];
  loading.value = false;
};

onShow(() => {
  fetchMyPublished();
});

const themes = [
  {
    iconBg: 'bg-amber-200',
    iconColor: '#fde68a',
    tagBg: 'bg-amber-50',
    tagColor: '#fffbeb',
    tagText: 'text-amber-700',
    reqBg: 'bg-amber-200',
    reqColor: '#fde68a',
    reqText: 'text-amber-900'
  },
  {
    iconBg: 'bg-pink-200',
    iconColor: '#fbcfe8',
    tagBg: 'bg-pink-50',
    tagColor: '#fdf2f8',
    tagText: 'text-pink-700',
    reqBg: 'bg-pink-200',
    reqColor: '#fbcfe8',
    reqText: 'text-pink-900'
  },
  {
    iconBg: 'bg-emerald-200',
    iconColor: '#a7f3d0',
    tagBg: 'bg-emerald-50',
    tagColor: '#ecfdf5',
    tagText: 'text-emerald-700',
    reqBg: 'bg-emerald-200',
    reqColor: '#a7f3d0',
    reqText: 'text-emerald-900'
  },
  {
    iconBg: 'bg-blue-200',
    iconColor: '#bfdbfe',
    tagBg: 'bg-blue-50',
    tagColor: '#eff6ff',
    tagText: 'text-blue-700',
    reqBg: 'bg-blue-200',
    reqColor: '#bfdbfe',
    reqText: 'text-blue-900'
  },
  {
    iconBg: 'bg-purple-200',
    iconColor: '#e9d5ff',
    tagBg: 'bg-purple-50',
    tagColor: '#faf5ff',
    tagText: 'text-purple-700',
    reqBg: 'bg-purple-200',
    reqColor: '#e9d5ff',
    reqText: 'text-purple-900'
  }
];

const getTheme = (name: string) => {
  if (!name) return themes[0];
  const index = name.charCodeAt(0) % themes.length;
  return themes[index];
};

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
};
</script>

<template>
  <view class="pb-20 bg-gray-50 min-h-screen">
    <view class="p-4 space-y-4">
       <view v-if="loading" class="text-center py-8 text-gray-400">加载中...</view>
       
       <view v-else-if="resources.length === 0" class="text-center py-12 bg-white rounded-xl">
          <text class="text-gray-400 block mb-2">暂无发布记录</text>
          <text class="text-xs text-gray-300 block">快去发布第一条资源吧</text>
       </view>

       <view 
        v-for="item in resources" 
        :key="item._id"
        class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden mb-4"
        @click="goToDetail(item._id)"
      >
        <!-- ID Badge (Top Right) -->
        <view class="absolute top-0 right-0 bg-slate-800 text-white text-xs px-3 py-1 rounded-bl-lg font-medium z-10">
           No.{{ (item._id || '').slice(0, 5) }}
        </view>

        <!-- Top Header: Name . City -->
        <view class="text-sm text-gray-600 mb-3 pr-20 font-medium">
          {{ item.contact_name }} · {{ item.city }}
        </view>

        <view class="flex flex-row items-stretch space-x-3 mb-4">
          <!-- Left Icon Block (Company Name First Char) -->
          <view 
            class="w-[100rpx] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" 
            :class="getTheme(item.company_name).iconBg"
            :style="{ backgroundColor: getTheme(item.company_name).iconColor }"
          >
             <text class="text-2xl font-bold text-black">{{ item.company_name ? item.company_name.charAt(0) : '' }}</text>
          </view>

          <!-- Right Content Block -->
          <view class="flex-1 min-w-0 pt-0.5">
             <!-- Title Row -->
             <view class="mb-2">
               <text class="font-bold text-lg text-gray-900 leading-tight">{{ item.company_name }}</text>
             </view>
             
             <!-- Tags Row -->
             <view class="flex flex-row flex-wrap gap-2">
                 <!-- Main Category Pill -->
                 <text 
                   class="text-xs px-2 py-1 rounded font-medium"
                   :class="[getTheme(item.company_name).tagBg, getTheme(item.company_name).tagText]"
                   :style="{ backgroundColor: getTheme(item.company_name).tagColor }"
                 >{{ item.category }}</text>
                 <!-- Sub Category Pills -->
                 <text 
                   v-if="item.sub_category" 
                   v-for="sub in (item.sub_category || '').split(',').slice(0, 2)" 
                   :key="sub" 
                   class="text-xs px-2 py-1 rounded font-medium"
                   :class="[getTheme(item.company_name).tagBg, getTheme(item.company_name).tagText]"
                   :style="{ backgroundColor: getTheme(item.company_name).tagColor }"
                 >{{ sub }}</text>
             </view>
          </view>
        </view>

        <!-- Requirements Row -->
        <view class="flex flex-row items-start space-x-2 mb-2.5">
           <text 
             class="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
             :class="[getTheme(item.company_name).reqBg, getTheme(item.company_name).reqText]"
             :style="{ backgroundColor: getTheme(item.company_name).reqColor }"
           >需求</text>
           <text class="text-sm text-gray-800 leading-relaxed line-clamp-2">{{ item.requirements }}</text>
        </view>

        <!-- Intro Row -->
        <view class="flex flex-row items-start space-x-2">
           <text class="text-xs font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">介绍</text>
           <text class="text-sm text-gray-600 leading-relaxed line-clamp-2">{{ item.description }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
</style>
