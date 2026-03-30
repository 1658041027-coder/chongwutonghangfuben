import { ref } from 'vue';

const user = ref<any>(null);
const loading = ref(false);

export function useUser() {
  const fetchUser = async () => {
    let userId = null;
    try {
      userId = uni.getStorageSync('pet_user_id');
    } catch (e) {
      // ignore
    }

    if (!userId) {
      // 尝试获取本地用户
      user.value = null;
      return;
    }

    // 如果已有用户且 id 一致，不再重复请求（简单的缓存策略）
    if (user.value && user.value._id === userId) {
      return;
    }

    loading.value = true;
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').doc(userId).get();
      
      if (res.data) {
        user.value = { ...res.data, _id: userId };
      } else {
        // 用户不存在，清除本地存储
        uni.removeStorageSync('pet_user_id');
        user.value = null;
      }
    } catch (error: any) {
      console.error('Error fetching user:', error);
      // 如果出错可能是因为 id 不存在，清除本地存储
      if (error.errCode === -1 || error.errMsg.includes('does not exist')) {
        uni.removeStorageSync('pet_user_id');
      }
      user.value = null;
    } finally {
      loading.value = false;
    }
  };

  const updateUser = (newData: any) => {
    user.value = { ...user.value, ...newData };
  };

  return {
    user,
    loading,
    fetchUser,
    updateUser
  };
}
