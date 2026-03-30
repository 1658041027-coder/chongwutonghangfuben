<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { db } from '@/lib/cloud';
import { useUser } from '@/composables/useUser';
import { logout, getOrCreateUser, updateUserProfile } from '@/lib/auth';
import { User, Crown, Users, Calendar, FileText, Star, MessageCircle, Settings, Edit2, Check, X, LogOut, ChevronRight } from 'lucide-vue-next';

const { user, loading, fetchUser, updateUser } = useUser();

// Local UI state
const isEditing = ref(false);
const editName = ref('');

// Init
onShow(async () => {
  await fetchUser();
  // Force refresh user data to ensure VIP status/expiration is up-to-date
  // This handles the case where we return from the VIP payment page
  if (user.value?._id) {
    try {
      const { data } = await db.collection('users').doc(user.value._id).get();
      if (data) {
        updateUser(data);
      }
    } catch (e) {
      console.error('Failed to refresh user data:', e);
    }
  }
});

// Actions
const startEdit = () => {
  if (user.value) {
    editName.value = user.value.nickname;
    isEditing.value = true;
  }
};

const cancelEdit = () => {
  isEditing.value = false;
  if (user.value) {
    editName.value = user.value.nickname;
  }
};

const onNicknameBlur = (e: any) => {
  // 处理微信昵称快捷输入
  // 务必使用 e.detail.value 获取微信填入的值
  if (e.detail && e.detail.value) {
    editName.value = e.detail.value;
  }
};

const saveName = async () => {
  // 再次确认值（防止 blur 未触发或值为空）
  if (!editName.value) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' });
    return;
  }
  
  const newName = editName.value.trim();
  if (!newName) return;

  uni.showLoading({ title: '保存中...' });
  
  try {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'secCheck',
        data: { content: newName }
      });
      const code = (result as any)?.code;
      if (typeof code === 'number' && code !== 0) {
        uni.hideLoading();
        uni.showToast({ title: (result as any)?.msg || '昵称包含敏感内容', icon: 'none' });
        return;
      }
    } catch (e) {
      // ignore
    }

    await updateUserProfile(user.value._id, { nickname: newName });
    
    // Update local state
    updateUser({ nickname: newName });
    
    // Clear home cache to force refresh on next visit
    uni.setStorageSync('should_refresh_home', true);
    uni.removeStorageSync('home_resources_cache');
    
    isEditing.value = false;
    uni.showToast({ title: '修改成功', icon: 'success' });
  } catch (e: any) {
    console.error('Error updating name:', e);
    uni.showToast({ title: '修改失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};


const onChooseAvatar = (e: any) => {
  const { avatarUrl } = e.detail;
  if (avatarUrl) {
    uploadAvatar(avatarUrl);
  }
};

const uploadAvatar = async (filePath: string) => {
  if (!user.value) return;

  uni.showLoading({ title: '上传中...' });

  try {
    const fileExt = filePath.split('.').pop() || 'jpg';
    const cloudPath = `avatars/${user.value._id}-${Date.now()}.${fileExt}`;

    const { fileID } = await wx.cloud.uploadFile({
      cloudPath,
      filePath,
    });

    const { fileList } = await wx.cloud.getTempFileURL({ fileList: [fileID] });
    const publicUrl = fileList[0].tempFileURL;

    await updateUserProfile(user.value._id, { avatar_url: publicUrl });
    updateUser({ avatar_url: publicUrl });
    uni.showToast({ title: '头像更新成功' });

  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    uni.showToast({ title: '上传失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const goToVip = () => {
  uni.navigateTo({ url: '/pages/vip/vip' });
};

const handleWechatGroups = () => {
  if (user.value?.is_vip) {
    uni.navigateTo({ url: '/pages/wechat-groups/wechat-groups' });
  } else {
    uni.showModal({
      title: '提示',
      content: '查看微信群需要开通会员权限，是否前往开通？',
      success: (res) => {
        if (res.confirm) {
          goToVip();
        }
      }
    });
  }
};

const handleExhibition = () => {
    uni.navigateTo({ url: '/pages/exhibition/exhibition' });
};

const handleMyPublished = () => {
    uni.navigateTo({ url: '/pages/my-published/my-published' });
};

const handleMyFavorites = () => {
    uni.navigateTo({ url: '/pages/my-favorites/my-favorites' });
};

const handleMyOrders = () => {
  uni.navigateTo({ url: '/pages/my-orders/my-orders' });
};

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        logout();
        user.value = null;
        uni.reLaunch({ url: '/pages/mine/mine' }); // Reload current page
      }
    }
  });
};

const handleLogin = async () => {
  // In real mini program, this would invoke uni.getUserProfile or uni.login
  // Here we use the mock login/create from auth.ts
  uni.showLoading({ title: '登录中...' });
  try {
    await getOrCreateUser();
    await fetchUser();
  } catch (e) {
    console.error(e);
    uni.showToast({ title: '登录失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
</script>

<template>
  <view class="bg-gray-50 min-h-screen pb-20">
    <!-- Loading State -->
    <view v-if="loading" class="flex justify-center items-center h-screen pb-20">
      <view class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></view>
    </view>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <view class="bg-white p-6 mb-4">
        <view v-if="user" class="flex flex-row items-center space-x-6">
          <!-- Avatar -->
          <button 
            class="w-100 h-100 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-md relative flex items-center justify-center p-0 m-0 flex-shrink-0" 
            open-type="chooseAvatar" 
            @chooseavatar="onChooseAvatar"
          >
            <image v-if="user.avatar_url" :src="user.avatar_url" class="w-full h-full" mode="aspectFill" />
            <User v-else class="text-gray-400 w-12 h-12" :size="48" />
          </button>
          
          <!-- User Info -->
          <view class="flex-1 min-w-0">
            <view class="flex flex-row items-center flex-wrap gap-2">
              <!-- Edit Mode -->
              <view v-if="isEditing" class="flex flex-row items-center space-x-2 w-full mb-2">
                <input 
                  v-model="editName" 
                  type="nickname"
                  class="border rounded px-3 py-2 text-lg text-gray-800 flex-1 bg-gray-50 h-10"
                  focus
                  @blur="onNicknameBlur"
                />
                <view @click="saveName" class="text-green-600 px-3 flex items-center justify-center h-10 active:opacity-70">
                  <text class="text-3xl font-black leading-none">✔</text>
                </view>
                <view @click="cancelEdit" class="text-gray-400 px-3 flex items-center justify-center h-10 active:opacity-70">
                  <text class="text-3xl font-black leading-none">×</text>
                </view>
              </view>
              
              <!-- Display Mode -->
              <view v-else class="flex flex-row items-center gap-2" @click="startEdit">
                <text class="text-2xl font-bold text-gray-900 leading-tight">{{ user.nickname }}</text>
                <view class="text-gray-400 p-1 flex items-center">
                  <Edit2 :size="18" />
                </view>
                
                <view v-if="user.is_vip" class="flex items-center ml-1">
                   <Crown class="text-yellow-500 fill-current" :size="20" />
                </view>
                <text v-else class="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full border border-gray-200">普通用户</text>
              </view>
            </view>
            
            <text class="text-sm text-gray-500 mt-2 block font-medium">ID: {{ user.userid || user.openid?.slice(-8) || 'Unknown' }}</text>
          </view>
        </view>
        
        <!-- Not Logged In -->
        <view v-else class="flex flex-row items-center space-x-6" @click="handleLogin">
          <view class="w-100 h-100 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-md">
            <User class="text-gray-300" :size="48" />
          </view>
          <view>
            <text class="text-2xl font-bold text-gray-800 block mb-1">点击登录</text>
            <text class="text-sm text-gray-500 block">登录后体验更多功能</text>
          </view>
        </view>
      </view>

      <!-- VIP Section -->
      <view v-if="user?.is_vip">
        <view 
          class="mx-4 mb-4 rounded-xl p-4 text-white flex flex-row justify-between items-center shadow-lg bg-gradient-to-r from-yellow-600 to-yellow-400"
          @click="goToVip"
        >
          <view>
            <view class="font-bold text-lg flex flex-row items-center">
              <Crown class="mr-2 text-white" :size="20" />
              <text>尊贵的VIP会员</text>
            </view>
            <text class="text-xs mt-1 text-yellow-100 block">
              有效期至：{{ formatDate(user.vip_expire_at) }}
            </text>
          </view>
        </view>

             <view class="bg-white mx-4 rounded-xl shadow-sm p-4 mb-4">
          <text class="font-bold text-gray-800 mb-8 block">常用功能</text>
          <view class="grid grid-cols-4 gap-4 text-center">
            <view class="flex flex-col items-center space-y-2" @click="handleWechatGroups">
              <image src="/static/微信群.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">微信群</text>
            </view>
            <view class="flex flex-col items-center space-y-2" @click="handleExhibition">
              <image src="/static/产品库.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">宠物展</text>
            </view>
            <view class="flex flex-col items-center space-y-2" @click="handleMyPublished">
              <image src="/static/我发布的.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">我发布的</text>
            </view>
            <view class="flex flex-col items-center space-y-2" @click="handleMyFavorites">
              <image src="/static/我收藏的.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">我收藏的</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Non-VIP Section -->
      <view v-else>
        <view 
          class="mx-4 mb-4 rounded-xl p-4 text-white flex flex-row justify-between items-center shadow-lg bg-gradient-to-r from-gray-800 to-gray-700"
          @click="goToVip"
        >
          <view>
            <view class="font-bold text-lg flex flex-row items-center">
              <Crown class="mr-2 text-yellow-400" :size="20" />
              <text>开通VIP会员</text>
            </view>
            <text class="text-xs mt-1 text-gray-300 block">
              解锁查看联系方式权限
            </text>
          </view>
          <view class="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-400 text-gray-900">
            立即开通
          </view>
        </view>

        <view class="bg-white mx-4 rounded-xl shadow-sm p-4 mb-4">
          <text class="font-bold text-gray-800 mb-8 block">常用功能</text>
          <view class="grid grid-cols-4 gap-4 text-center">
            <view class="flex flex-col items-center space-y-2" @click="handleWechatGroups">
              <image src="/static/微信群.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">微信群</text>
            </view>
            <view class="flex flex-col items-center space-y-2" @click="handleExhibition">
              <image src="/static/产品库.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">宠物展</text>
            </view>
            <view class="flex flex-col items-center space-y-2" @click="handleMyPublished">
              <image src="/static/我发布的.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">我发布的</text>
            </view>
            <view class="flex flex-col items-center space-y-2" @click="handleMyFavorites">
              <image src="/static/我收藏的.png" style="width: 40px; height: 40px;" mode="aspectFit" />
              <text class="text-xs text-gray-600">我收藏的</text>
            </view>
          </view>
        </view>


      </view>

      <!-- Settings List -->
      <view class="bg-white mx-4 rounded-xl shadow-sm overflow-hidden mb-6">
        <button class="p-4 border-b border-gray-50 flex flex-row items-center justify-between active:bg-gray-50 w-full bg-white text-left m-0 leading-normal" open-type="contact">
          <view class="flex flex-row items-center space-x-3">
            <MessageCircle class="text-gray-400" :size="20" />
            <text class="text-sm text-gray-700">联系客服</text>
          </view>
          <text class="text-xs text-gray-400">9:00-18:00</text>
        </button>
        
        <view class="p-4 flex flex-row items-center justify-between active:bg-gray-50" @click="handleMyOrders">
          <view class="flex flex-row items-center space-x-3">
            <FileText class="text-gray-400" :size="20" />
            <text class="text-sm text-gray-700">我的订单</text>
          </view>
          <ChevronRight class="text-gray-300" :size="16" />
        </view>

        <view v-if="user" class="p-4 flex flex-row items-center justify-between active:bg-gray-50 border-t border-gray-50" @click="handleLogout">
          <view class="flex flex-row items-center space-x-3">
            <LogOut class="text-red-500" :size="20" />
            <text class="text-sm text-red-500 font-medium">退出登录</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
/* Scoped styles if needed, mostly using Tailwind/UnoCSS */
button::after {
  border: none !important;
  width: 0; 
  height: 0;
  display: none;
}
</style>
