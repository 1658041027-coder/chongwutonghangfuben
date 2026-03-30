<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { db, _ } from '../../lib/cloud';
import { useUser } from '../../composables/useUser';
import { Star, Share2, MoreHorizontal } from 'lucide-vue-next';

const id = ref('');
const resource = ref<any>(null);
const loading = ref(true);
const { user, fetchUser } = useUser();

onLoad((options: any) => {
  console.log('[DEBUG] Detail Page onLoad options:', options);
  let resourceId = options.id || options._id;

  // Handle scene (e.g. from QR code)
  if (!resourceId && options.scene) {
    resourceId = decodeURIComponent(options.scene);
  }

  // Normalize ID
  if (resourceId) {
    resourceId = String(resourceId).trim();
  }

  if (resourceId && resourceId !== 'undefined' && resourceId !== 'null') {
    id.value = resourceId;
    console.log('[DEBUG] Detail Page loaded with valid ID:', resourceId);
    fetchResource(resourceId);
  } else {
    console.error('[DEBUG] No valid ID provided in options:', options);
    uni.showToast({ title: '参数错误: ID缺失', icon: 'none' });
  }
});

onShareAppMessage(() => {
  return {
    title: resource.value?.company_name || '同行资源',
    path: `/pages/detail/detail?id=${id.value}`
  };
});

onMounted(async () => {
  await fetchUser();
  if (id.value) {
    checkFavoriteStatus();
  }
});

const fetchResource = async (resourceId: string) => {
  // Strict validation
  if (!resourceId) {
    console.error('Error fetching resource: ID is empty/null/undefined');
    uni.showToast({ title: '资源ID为空', icon: 'none' });
    loading.value = false;
    return;
  }
  
  const invalidValues = ['undefined', 'null', '[object Object]'];
  if (invalidValues.includes(String(resourceId).toLowerCase().trim())) {
    console.error('Error fetching resource: ID is invalid string:', resourceId);
    uni.showToast({ title: '资源ID无效', icon: 'none' });
    loading.value = false;
    return;
  }

  console.log('[DEBUG] Fetching resource with ID:', resourceId, 'Type:', typeof resourceId, 'Length:', resourceId.length);
  loading.value = true;
  try {
    const res = await db.collection('resources').doc(resourceId).get();
    console.log('[DEBUG] Fetch resource result:', res);
    
    // Fetch associated user for VIP info
    let userData = {};
    if (res.data && res.data.user_id) {
      const userId = res.data.user_id;
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        try {
           const userRes = await db.collection('users').doc(userId).get();
           userData = userRes.data;
        } catch (uErr) {
           console.warn('Failed to fetch user data for resource:', resourceId, uErr);
        }
      }
    }
    
    resource.value = {
      ...res.data,
      users: userData
    };
  } catch (error: any) {
    console.error('Error fetching resource:', error);
    // Check for specific "undefined" error from DB
    if (error && (error.message || '').includes('undefined')) {
      uni.showToast({ title: '资源不存在', icon: 'none' });
    } else {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
};

const themes = [
  {
    iconBg: 'bg-amber-200',
    iconColor: '#fde68a',
    tagBg: 'bg-amber-50',
    tagColor: '#fffbeb',
    tagText: 'text-amber-700'
  },
  {
    iconBg: 'bg-pink-200',
    iconColor: '#fbcfe8',
    tagBg: 'bg-pink-50',
    tagColor: '#fdf2f8',
    tagText: 'text-pink-700'
  },
  {
    iconBg: 'bg-emerald-200',
    iconColor: '#a7f3d0',
    tagBg: 'bg-emerald-50',
    tagColor: '#ecfdf5',
    tagText: 'text-emerald-700'
  },
  {
    iconBg: 'bg-blue-200',
    iconColor: '#bfdbfe',
    tagBg: 'bg-blue-50',
    tagColor: '#eff6ff',
    tagText: 'text-blue-700'
  },
  {
    iconBg: 'bg-purple-200',
    iconColor: '#e9d5ff',
    tagBg: 'bg-purple-50',
    tagColor: '#faf5ff',
    tagText: 'text-purple-700'
  }
];

const getTheme = (name: string) => {
  if (!name) return themes[0];
  const index = name.charCodeAt(0) % themes.length;
  return themes[index];
};

const getIconColor = (name: string) => {
  return getTheme(name).iconBg;
};

const getIconStyle = (name: string) => {
  return `background-color: ${getTheme(name).iconColor}`;
};

const handleCall = () => {
  if (resource.value?.phone) {
    uni.makePhoneCall({ phoneNumber: resource.value.phone });
  }
};

const handleCopyWechat = () => {
  if (resource.value?.wechat) {
    uni.setClipboardData({
      data: resource.value.wechat,
      success: () => uni.showToast({ title: '微信号已复制' })
    });
  }
};

const goToVip = () => {
  uni.navigateTo({ url: '/pages/vip/vip' });
};

const isFavorite = ref(false);

const checkFavoriteStatus = async () => {
  if (!user.value?._id || !id.value) return;

  try {
    const { data } = await db.collection('favorites').where({
      user_id: user.value._id,
      resource_id: id.value
    }).get();

    if (data && data.length > 0) {
      isFavorite.value = true;
    }
  } catch (error) {
    console.error('Error checking favorite status:', error);
  }
};

const toggleFavorite = async () => {
  if (!user.value?._id) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  if (!id.value) {
    uni.showToast({ title: '资源ID无效', icon: 'none' });
    return;
  }

  try {
    if (isFavorite.value) {
      // Remove favorite (Safe delete by ID)
      const { data } = await db.collection('favorites').where({
        user_id: user.value._id,
        resource_id: id.value
      }).get();
      
      if (data && data.length > 0) {
        await db.collection('favorites').doc(data[0]._id).remove();
      }
      
      isFavorite.value = false;
      uni.showToast({ title: '已取消收藏' });
    } else {
      // Add favorite
      await db.collection('favorites').add({
        data: {
          user_id: user.value._id,
          resource_id: id.value,
          created_at: db.serverDate()
        }
      });
      
      isFavorite.value = true;
      uni.showToast({ title: '收藏成功' });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
};

const handleContact = () => {
  if (!user.value?.is_vip) {
    uni.showModal({
      title: '提示',
      content: '只有 VIP 会员才能查看联系方式，是否去开通？',
      confirmText: '去开通',
      success: (res) => {
        if (res.confirm) {
          goToVip();
        }
      }
    });
    return;
  }
  
  uni.showActionSheet({
    itemList: ['拨打电话', '复制微信号'],
    success: (res) => {
      if (res.tapIndex === 0 && resource.value.phone) {
        uni.makePhoneCall({ phoneNumber: resource.value.phone });
      } else if (res.tapIndex === 1 && resource.value.wechat) {
        uni.setClipboardData({
          data: resource.value.wechat,
          success: () => uni.showToast({ title: '已复制微信号' })
        });
      }
    }
  });
};
</script>

<template>
  <view class="min-h-screen bg-gray-100 pb-20">
    <view v-if="loading" class="text-center py-12 text-gray-400">加载中...</view>
    
    <view v-else-if="resource" class="p-3 space-y-3">
      <!-- 1. Header Card -->
      <view class="bg-white p-4 rounded-xl shadow-sm">
        <view class="flex flex-row items-center space-x-4 mb-3">
          <!-- Icon -->
          <view class="w-100 h-100 rounded-2xl flex items-center justify-center text-3xl font-bold text-black shadow-sm flex-shrink-0" 
            :style="getIconStyle(resource.company_name)"
          >
            {{ resource.company_name?.charAt(0) }}
          </view>
          
          <view class="flex-1">
            <!-- Title -->
            <view class="flex flex-row items-center justify-between">
               <text class="text-xl font-bold text-gray-900 leading-tight">{{ resource.company_name }}</text>
            </view>
            
            <!-- Tags -->
            <view class="flex flex-row flex-wrap gap-1.5 mt-2">
              <text class="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded font-medium">{{ resource.contact_name }}</text>
              <text class="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">{{ resource.city }}</text>
            </view>
          </view>
        </view>
        
        <!-- Category Tags -->
        <view class="flex flex-row flex-wrap gap-1.5">
           <text 
             class="px-2 py-0.5 text-xs rounded-full"
             :class="[getTheme(resource.company_name).tagBg, getTheme(resource.company_name).tagText]"
             :style="{ backgroundColor: getTheme(resource.company_name).tagColor }"
           >{{ resource.category }}</text>
           <text 
             v-for="sub in resource.sub_category?.split(',')" 
             :key="sub" 
             class="px-2 py-0.5 text-xs rounded-full"
             :class="[getTheme(resource.company_name).tagBg, getTheme(resource.company_name).tagText]"
             :style="{ backgroundColor: getTheme(resource.company_name).tagColor }"
           >{{ sub }}</text>
        </view>
      </view>

      <!-- 2. VIP Banner / Contact Info -->
      <view class="bg-blue-50 rounded-xl p-4 shadow-sm mb-3">
        <!-- VIP Case: Show Contact Info -->
        <view v-if="user?.is_vip" class="flex flex-col space-y-3">
           <view class="flex flex-row items-center justify-between">
             <view class="flex flex-col">
               <text class="text-gray-500 text-xs mb-0.5">手机号</text>
               <text class="text-gray-900 font-bold text-lg tracking-wide" @click="handleCall">{{ resource.phone || '未提供' }}</text>
             </view>
             <view v-if="resource.phone" class="bg-white text-blue-600 border border-blue-100 text-xs px-4 py-1.5 rounded-full font-medium" @click="handleCall">拨打</view>
           </view>
           <view class="h-[1px] bg-blue-100 w-full"></view>
           <view class="flex flex-row items-center justify-between">
             <view class="flex flex-col">
               <text class="text-gray-500 text-xs mb-0.5">微信号</text>
               <text class="text-gray-900 font-bold text-lg tracking-wide" @click="handleCopyWechat">{{ resource.wechat || '未提供' }}</text>
             </view>
             <view v-if="resource.wechat" class="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-medium" @click="handleCopyWechat">复制</view>
           </view>
        </view>

        <!-- Non-VIP Case: Show Banner -->
        <view v-else class="flex flex-row items-center justify-between relative overflow-hidden">
          <view class="flex-1 z-10">
            <view class="text-yellow-400 font-bold text-sm mb-0.5">
              开通VIP 查看所有电话&微信
            </view>
            <view class="text-yellow-500/80 text-[10px]">
              目前更新1000+条资源需求
            </view>
          </view>
          <view class="z-10">
             <button class="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded shadow-lg border-none leading-none" @click="goToVip">
               立即<br/>开通
             </button>
          </view>
        </view>
      </view>

      <!-- 3. Intro Card (New) -->
      <view class="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
        <view class="relative p-4 pt-5">
           <!-- Blue Tag Badge -->
           <view class="absolute top-0 left-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg z-10">
             介绍
           </view>
           <text class="text-sm text-gray-800 font-medium block mt-1 leading-relaxed">{{ resource.description || '暂无介绍' }}</text>
        </view>
      </view>

      <!-- 4. Requirements Card -->
      <view class="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
        <view class="relative p-4 pt-5">
           <!-- Orange Tag Badge -->
           <view class="absolute top-0 left-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg z-10">
             合作需求
           </view>
           <text class="text-sm text-gray-800 font-medium block mt-1 leading-relaxed">{{ resource.requirements || '暂无需求' }}</text>
        </view>
      </view>

      <!-- 4. Footer Info -->
      <view class="px-2 mt-4">
        <view class="flex flex-row items-center justify-center space-x-1 py-2">
           <text class="text-[10px] text-gray-400 bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center">!</text>
           <text class="text-[10px] text-gray-400 underline decoration-gray-300">信息有误？可联系客服更新</text>
        </view>
      </view>
      
      <!-- Spacer for bottom bar -->
      <view class="h-16"></view>

      <!-- 5. Bottom Action Bar -->
      <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-row items-center safe-area-bottom z-50 h-[50px]">
         <view class="flex-1 flex flex-col items-center justify-center h-full" @click="uni.switchTab({ url: '/pages/index/index' })">
           <image src="/static/资源库1.png" style="width: 30px; height: 30px;" mode="aspectFit" />
           <text class="text-[10px] text-[#999999] mt-0.5">资源库</text>
         </view>
         
         <view class="flex-1 flex flex-col items-center justify-center h-full" @click="toggleFavorite">
           <image :src="isFavorite ? '/static/收藏 -已收藏.png' : '/static/收藏-未收藏.png'" style="width: 30px; height: 30px;" mode="aspectFit" />
           <text class="text-[10px] text-[#999999] mt-0.5">{{ isFavorite ? '已收藏' : '收藏' }}</text>
         </view>
         
         <button class="flex-1 flex flex-col items-center justify-center h-full bg-transparent border-none p-0 m-0 leading-none after:border-none" open-type="share" style="background-color: transparent; line-height: normal;">
           <Share2 :size="24" class="text-[#999999]" />
           <image src="/static/分享1.png" style="width: 30px; height: 30px;" mode="aspectFit" />
           <text class="text-[10px] text-[#999999] mt-0.5">分享</text>
         </button>
      </view>
    </view>
    
    <view v-else class="text-center py-12 text-gray-400">
      <text>未找到资源信息</text>
    </view>
  </view>
</template>

<style>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
button::after {
  border: none;
}
</style>