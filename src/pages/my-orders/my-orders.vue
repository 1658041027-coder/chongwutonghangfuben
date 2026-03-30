<script setup lang="ts">
import { ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { db } from '@/lib/cloud';
import { useUser } from '@/composables/useUser';
import { FileText, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-vue-next';

const { user } = useUser();
const orders = ref<any[]>([]);
const loading = ref(false);

const fetchOrders = async () => {
  if (!user.value) return;
  
  loading.value = true;
  try {
    const { data } = await db.collection('orders')
      .where({
        userId: user.value._id,
        status: 'SUCCESS'
      })
      .orderBy('createTime', 'desc')
      .get();
      
    orders.value = data;
  } catch (error) {
    console.error('获取订单失败', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
};

onShow(() => {
  fetchOrders();
});

onPullDownRefresh(() => {
  fetchOrders();
});

const formatDate = (date: any) => {
  if (!date) return '';
  // Handle both ISO string and Cloud Date object
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'SUCCESS': return '已支付';
    case 'PENDING': return '待支付';
    case 'FAIL': return '支付失败';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'text-green-500';
    case 'PENDING': return 'text-orange-500';
    case 'FAIL': return 'text-red-500';
    default: return 'text-gray-500';
  }
};
</script>

<template>
  <view class="bg-gray-50 min-h-screen pb-safe">
    <!-- Header Placeholder -->
    <view class="h-[var(--status-bar-height)] w-full bg-white"></view>
    
    <view class="p-4 space-y-4">
      <view v-if="loading && orders.length === 0" class="flex justify-center py-10">
        <view class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></view>
      </view>

      <view v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <FileText :size="48" class="mb-4 opacity-50" />
        <text>暂无已支付订单</text>
      </view>

      <view 
        v-else 
        v-for="order in orders" 
        :key="order._id"
        class="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <view class="flex justify-between items-start mb-3 pb-3 border-b border-gray-50">
          <view>
            <text class="font-bold text-gray-800 block text-lg">{{ order.title || '商品购买' }}</text>
            <text class="text-xs text-gray-400 mt-1 block">订单号: {{ order.outTradeNo }}</text>
          </view>
          <view class="flex items-center space-x-1">
             <CheckCircle v-if="order.status === 'SUCCESS'" :size="14" class="text-green-500" />
             <Clock v-else-if="order.status === 'PENDING'" :size="14" class="text-orange-500" />
             <XCircle v-else :size="14" class="text-red-500" />
             <text class="text-sm font-medium" :class="getStatusColor(order.status)">
               {{ getStatusText(order.status) }}
             </text>
          </view>
        </view>

        <view class="flex justify-between items-center">
          <view class="text-xs text-gray-500">
            <text class="block">创建时间: {{ formatDate(order.createTime) }}</text>
            <text v-if="order.payTime" class="block mt-1">支付时间: {{ formatDate(order.payTime) }}</text>
          </view>
          <view class="text-right">
             <text class="text-xs text-gray-400 mr-1">实付</text>
             <text class="text-lg font-bold text-gray-900">¥{{ (order.totalFee / 100).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>