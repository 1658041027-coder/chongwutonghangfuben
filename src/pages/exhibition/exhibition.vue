<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { db } from '../../lib/cloud';
import { ArrowLeft } from 'lucide-vue-next';

const exhibitions = ref<any[]>([]);
const loading = ref(true);

const fetchExhibitions = async () => {
  loading.value = true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  try {
    const { data } = await db.collection('exhibitions')
      .orderBy('start_date', 'asc')
      .get();
      
    // Filter locally to debug
    console.log('Fetched exhibitions:', data);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const validData = (data || []).filter((ex: any) => {
       const endDate = new Date(ex.end_date);
       return endDate >= now;
    });

    exhibitions.value = validData.map((ex: any) => {
      const startDate = new Date(ex.start_date);
      const endDate = new Date(ex.end_date);
      
      let status = 'ended';
      if (now < startDate) {
        status = 'upcoming';
      } else if (now >= startDate && now <= endDate) {
        status = 'ongoing';
      } else {
        status = 'ended';
      }

      // Format date range string: "YYYY-MM-DD ~ MM-DD"
      const startStr = ex.start_date; 
      const endStr = ex.end_date.substring(5); 
      const dateStr = `${startStr} ~ ${endStr}`;

      return {
        ...ex,
        status,
        date: dateStr
      };
    });
  } catch (error) {
    console.error('Error fetching exhibitions:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  fetchExhibitions();
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'upcoming': return 'bg-blue-100 text-blue-600';
    case 'ongoing': return 'bg-green-100 text-green-600';
    case 'ended': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-500';
  }
};

const getBackgroundColor = (index: number) => {
  const colors = ['bg-pink-200', 'bg-blue-200', 'bg-purple-200', 'bg-green-200', 'bg-yellow-200'];
  return colors[index % colors.length];
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'upcoming': return '即将开始';
    case 'ongoing': return '进行中';
    case 'ended': return '已结束';
    default: return '未知';
  }
};
</script>

<template>
  <view class="bg-gray-50 min-h-screen pb-20">
    <view class="p-4">
       <view v-if="loading" class="text-center py-8 text-gray-400">加载中...</view>
       <view v-else-if="exhibitions.length === 0" class="text-center py-12">
          <text class="text-gray-400">暂无近期展会</text>
       </view>

       <view v-else class="space-y-4">
         <view v-for="(ex, index) in exhibitions" :key="ex.id" class="mb-4">
            <!-- Header: Description & Date -->
            <view class="flex flex-row items-center justify-between mb-2">
              <text class="font-bold text-gray-800 text-lg truncate flex-1 mr-2">{{ ex.description }}</text>
               <view class="px-2 py-1 rounded-full flex-shrink-0" :class="getBackgroundColor(index)">
                  <text class="text-gray-800 text-xs font-medium">{{ ex.date }}</text>
               </view>
            </view>
            
            <!-- Main Card: Title & Address -->
            <view class="rounded-xl p-4 shadow-sm relative" :class="getBackgroundColor(index)">
              <view class="pr-16">
                <text class="font-bold text-gray-800 text-base mb-2 block">{{ ex.title }}</text>
                <view class="flex flex-row items-start">
                   <!-- <MapPin :size="14" class="text-gray-400 mt-0.5 mr-1" /> -->
                   <text class="text-sm text-gray-500 block leading-relaxed">{{ ex.address }}</text>
                </view>
              </view>
              
              <!-- Status Badge -->
              <view class="absolute top-4 right-4 px-2 py-1 rounded-full flex items-center justify-center" :class="getStatusColor(ex.status)">
                <text class="text-xs font-medium">{{ getStatusText(ex.status) }}</text>
              </view>
            </view>
         </view>
       </view>
    </view>
  </view>
</template>

<style scoped>
</style>
