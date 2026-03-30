<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { db, _ } from '../../lib/cloud';
import { useUser } from '../../composables/useUser';
import { User } from 'lucide-vue-next';

const showFilters = ref(false);
const { user, fetchUser } = useUser();

// Categories
const categories = [
  "全部", "源头工厂", "繁育商家", "品牌方", "经销商", "B端服务", 
  "全域电商", "本地商家", "新兴服务", "媒体达人", "行业组织"
];
const activeCategory = ref("全部");

// Search
const searchQuery = ref("");

// Resources Data
const resources = ref<any[]>([]);
const loading = ref(false);
const totalCount = ref(0);
const pageSize = 20;
const currentPage = ref(0);
const hasMore = ref(true);

// Fetch Resources
const fetchResources = async (isRefresh = false) => {
  if (isRefresh) {
    currentPage.value = 0;
    hasMore.value = true;
    loading.value = true;
  } else {
    // If no more data or already loading, stop
    if (!hasMore.value || loading.value) return;
    loading.value = true;
  }

  try {
    let query: any = {};
  
    // Filter by Category
    if (activeCategory.value !== "全部") {
      query.category = activeCategory.value;
    }

    // Filter by Search
    if (searchQuery.value) {
      const regex = db.RegExp({
        regexp: searchQuery.value,
        options: 'i',
      });
      
      const searchCondition = _.or([
        { company_name: regex },
        { description: regex },
        { requirements: regex }
      ]);

      if (Object.keys(query).length > 0) {
        query = _.and([query, searchCondition]);
      } else {
        query = searchCondition;
      }
    }
    
    // Fetch Total Count (only on refresh or first load)
    if (isRefresh || currentPage.value === 0) {
      const countRes = await db.collection('resources').where(query).count();
      totalCount.value = countRes.total;
    }

    // Fetch Data with Pagination
    const { data: resourcesData } = await db.collection('resources')
      .where(query)
      .orderBy('created_at', 'desc')
      .skip(currentPage.value * pageSize)
      .limit(pageSize)
      .get();

    if (resourcesData.length < pageSize) {
      hasMore.value = false;
    }

    // Fetch associated users for VIP info
    const userIds = [...new Set(resourcesData.map((r: any) => r.user_id))];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await db.collection('users')
        .where({
          _id: _.in(userIds)
        })
        .get();
      
      usersData.forEach((u: any) => {
        usersMap[u._id] = u;
      });
    }

    // Combine data
    const enrichedData = resourcesData.map((r: any) => ({
      ...r,
      users: usersMap[r.user_id] || {}
    }));
    
    // Client-side sorting (VIP first) - Note: This only sorts within the current page
    // For global VIP sorting, we would need to add vip_level to resources collection
    enrichedData.sort((a: any, b: any) => {
      let levelA = -1;
      if (a.users && typeof a.users.vip_level === 'number') levelA = a.users.vip_level;
      else if (a.users?.is_vip) levelA = 1;

      let levelB = -1;
      if (b.users && typeof b.users.vip_level === 'number') levelB = b.users.vip_level;
      else if (b.users?.is_vip) levelB = 1;

      if (levelA !== levelB) {
        return levelB - levelA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (isRefresh) {
      resources.value = enrichedData;
      uni.setStorageSync('home_resources_cache', enrichedData);
    } else {
      resources.value = [...resources.value, ...enrichedData];
    }
    
    currentPage.value++;

  } catch (error) {
    console.error('Error fetching resources:', error);
  } finally {
    loading.value = false;
  }
};

watch([activeCategory, searchQuery], () => {
  fetchResources(true);
});

onMounted(() => {
  fetchUser(); 
  // Initial load logic
  const cached = uni.getStorageSync('home_resources_cache');
  if (cached && Array.isArray(cached) && cached.length > 0) {
     resources.value = cached;
     // Silently update in background
     fetchResources(true);
  } else {
     fetchResources(true);
  }
});

onShow(() => {
  const shouldRefresh = uni.getStorageSync('should_refresh_home');
  if (shouldRefresh) {
    uni.removeStorageSync('should_refresh_home');
    fetchResources(true);
  }
});

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    fetchResources(false);
  }
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

const goToVip = () => {
  uni.navigateTo({ url: '/pages/vip/vip' });
};

const goToDetail = (_id: string) => {
  if (!_id || _id === 'undefined' || _id === 'null') {
    uni.showToast({ title: '资源ID无效', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/detail/detail?id=${_id}` });
};

onPullDownRefresh(async () => {
  await fetchResources(true);
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="pb-20 bg-gray-50 min-h-screen">
    <!-- Header / Search -->
    <view class="bg-white px-4 py-2 sticky top-0 z-10 shadow-sm box-border flex flex-row items-center space-x-3">

      <view class="relative flex-1">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索同行资源" 
          confirm-type="search"
          @confirm="fetchResources"
          class="w-full bg-[#F5F6F7] rounded-full h-10 px-3 text-sm box-border text-center"
        />
      </view>
    </view>

    <!-- Filter & VIP Banner Row -->
    <view class="px-4 mt-4 flex flex-row space-x-3">
      <!-- Filter Trigger -->
      <view 
        @click="showFilters = !showFilters"
        class="flex-1 w-0 flex flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm active:bg-gray-50 h-14"
      >
        <view class="flex flex-row items-center space-x-2">
          <text class="text-sm font-medium text-gray-700">{{ activeCategory === '全部' ? '选择类别' : activeCategory }}</text>
        </view>
        <text class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ totalCount }}</text>
      </view>

      <!-- VIP Banner -->
      <view 
        class="flex-1 w-0 px-4 rounded-xl flex flex-row justify-between items-center shadow-sm " 
        :class="user?.is_vip ? 'bg-gradient-to-r from-yellow-100 to-yellow-50' : 'bg-gradient-to-r from-orange-100 to-orange-50'"
        @click="goToVip"
      >
        <view class="flex flex-row items-center space-x-2">
          <text :class="user?.is_vip ? 'text-yellow-600' : 'text-orange-500'" class="text-lg">👑</text>
          <text class="text-sm font-medium" :class="user?.is_vip ? 'text-yellow-800' : 'text-orange-800'">
            {{ user?.is_vip ? '尊贵VIP已开通' : '获取查看权限' }}
          </text>
        </view>
      </view>
    </view>

    <!-- Collapsible Categories -->
    <view v-if="showFilters" class="px-4 mt-3 grid grid-cols-4 gap-2">
      <view 
        v-for="cat in categories" 
        :key="cat"
        @click="activeCategory = cat; showFilters = false"
        class="px-2 py-2 rounded-lg text-xs text-center truncate"
        :class="activeCategory === cat ? 'bg-orange-500 text-white font-medium shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        {{ cat }}
      </view>
    </view>

    <!-- Resource List -->
    <view class="p-4 space-y-4">
      <!-- Skeleton Loading State -->
      <view v-if="loading" class="space-y-4">
        <view v-for="i in 5" :key="i" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse">
           <!-- Top Row -->
           <view class="flex justify-between items-center mb-4">
              <view class="h-4 bg-gray-200 rounded w-1/3"></view>
              <view class="h-5 w-16 bg-gray-200 rounded-full"></view>
           </view>
           
           <!-- Middle Content -->
           <view class="flex space-x-3 mb-4">
              <view class="w-[100rpx] h-[100rpx] bg-gray-200 rounded-xl flex-shrink-0"></view>
              <view class="flex-1 space-y-2 pt-1">
                 <view class="h-5 bg-gray-200 rounded w-2/3"></view>
                 <view class="flex space-x-2 mt-2">
                    <view class="h-5 w-12 bg-gray-200 rounded"></view>
                    <view class="h-5 w-12 bg-gray-200 rounded"></view>
                 </view>
              </view>
           </view>
           
           <!-- Bottom Lines -->
           <view class="space-y-2">
              <view class="h-4 bg-gray-200 rounded w-full"></view>
              <view class="h-4 bg-gray-200 rounded w-3/4"></view>
           </view>
        </view>
      </view>
      
      <view v-else-if="resources.length === 0" class="text-center py-12 bg-white rounded-xl">
        <text class="text-gray-400 mb-2 block">暂无相关资源</text>
        <text class="text-xs text-gray-300 block">去发布页添加第一条资源吧</text>
      </view>

      <view 
        v-for="item in resources" 
        :key="item._id"
        class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden mb-4"
        @click="goToDetail(item._id)"
      >
        <!-- ID Badge (Top Right) -->
        <view class="absolute top-0 right-0 bg-slate-800 text-white text-xs px-3 py-1 rounded-bl-lg font-medium z-10">
           No.{{ item.resourceid || (item._id|| '').slice(0, 5) }}
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
/* UnoCSS should handle most styles, but flex-row is explicit for uni-app sometimes */
</style>
