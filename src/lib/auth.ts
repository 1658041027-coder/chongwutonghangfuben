import { db } from './cloud';

export const getOrCreateUser = async () => {
  let userId = uni.getStorageSync('pet_user_id');
  
  if (!userId) {
    try {
      // 1. Get OpenID
      const { result } = await wx.cloud.callFunction({
        name: 'login',
      });
      const openid = (result as any).openid;

      if (!openid) throw new Error('Failed to get openid');

      // 2. Check if user exists
      const { data } = await db.collection('users').where({
        openid: openid
      }).get();

      if (data && data.length > 0) {
        userId = data[0]._id;
      } else {
        // 3. Create user
        
        // 生成顺序 ID (Axxxxxx)
        let customUserId = '';
        try {
          const { result: idResult } = await wx.cloud.callFunction({
            name: 'getNextUserId',
          });
          if (idResult && (idResult as any).userid) {
            customUserId = (idResult as any).userid;
          } else {
            throw new Error('Cloud function returned empty userid');
          }
        } catch (e: any) {
          console.error('Failed to get sequential ID:', e);
          // 在开发阶段，直接抛出错误，便于调试
          throw new Error(`生成用户ID失败: ${e.message || e.errMsg || JSON.stringify(e)}，请检查云函数 getNextUserId 是否部署`);
        }

        const newUser = {
          openid,
          userid: customUserId,
          nickname: '微信用户',
          avatar_url: '',
          is_vip: false,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        };
        const addRes = await db.collection('users').add({
          data: newUser
        });
        userId = addRes._id;
      }
      
      uni.setStorageSync('pet_user_id', userId);
    } catch (e) {
      console.error('Error in getOrCreateUser:', e);
      throw e;
    }
  }
  return userId;
};

export const getCurrentUserId = () => {
  return uni.getStorageSync('pet_user_id');
};

export const logout = () => {
  uni.removeStorageSync('pet_user_id');
};

/**
 * 更新用户个人资料（昵称、头像）
 * 同时同步更新资源列表中的公司名称（如果昵称改变）
 */
export const updateUserProfile = async (userId: string, data: { nickname?: string, avatar_url?: string }) => {
  try {
    // 1. 更新用户基本资料
    await db.collection('users').doc(userId).update({
      data: {
        ...data,
        updated_at: db.serverDate()
      }
    });

    // 2. 如果更新了昵称，同步更新资源表中的 company_name
    if (data.nickname) {
      const { data: userResources } = await db.collection('resources').where({
        user_id: userId
      }).get();

      if (userResources && userResources.length > 0) {
        const updates = userResources.map((res: any) => 
          db.collection('resources').doc(res._id).update({
            data: { company_name: data.nickname }
          })
        );
        await Promise.all(updates);
      }
    }
    return true;
  } catch (e) {
    console.error('Error updating user profile:', e);
    throw e;
  }
};