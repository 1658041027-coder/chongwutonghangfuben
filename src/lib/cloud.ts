
// 封装云开发相关逻辑

// 初始化云开发环境 (必须在调用 wx.cloud.database() 之前执行)
export const CLOUD_ENV_ID = 'cloud1-6grnnysib0500875'; // 你的云环境ID

let dbInstance: any;
let command: any;
let aggregate: any;

try {
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });
    dbInstance = wx.cloud.database({
      env: CLOUD_ENV_ID
    });
    command = dbInstance.command;
    aggregate = command.aggregate;
  } else {
    console.warn('wx.cloud is not available, using mock db');
    // Provide a minimal mock to prevent crash on import
    dbInstance = { 
      command: { aggregate: {} }, 
      collection: () => ({ 
        where: () => ({ orderBy: () => ({ get: async () => ({ data: [] }) }), get: async () => ({ data: [] }) }),
        doc: () => ({ get: async () => ({ data: {} }), update: async () => ({}), remove: async () => ({}), set: async () => ({}) }),
        add: async () => ({ _id: 'mock-id' })
      }),
      RegExp: (opts: any) => opts,
      serverDate: () => new Date()
    };
    command = { 
      aggregate: {},
      or: (arr: any[]) => ({}),
      and: (arr: any[]) => ({}),
      in: (arr: any[]) => ({})
    };
    aggregate = {};
  }
} catch (error) {
  console.error('Error initializing cloud database:', error);
  // Fallback mock
  dbInstance = { command: {} };
  command = {};
  aggregate = {};
}

// 确保 db 使用指定的环境 ID
export const db = dbInstance;
export const _ = command;
export const $ = aggregate;

// 获取当前用户信息（如果不存在则创建）
export async function getOrCreateUser() {
  try {
    // 1. 调用云函数获取 openid
    const { result } = await wx.cloud.callFunction({
      name: 'login',
    });
    
    // 兼容不同的返回值结构（直接返回 openid 或 包装在 result 对象中）
    const openid = (result as any).openid || (result as any).userInfo?.openId || (result as any).event?.userInfo?.openId;
    
    console.log('[DEBUG] Login Cloud Function Result:', result); // 添加日志方便调试
    
    if (!openid) {
      throw new Error('Failed to get openid: ' + JSON.stringify(result));
    }

    // 2. 查询数据库中是否存在该用户
    const { data } = await db.collection('users').where({
      openid: openid
    }).get();

    if (data && data.length > 0) {
      // 用户已存在，直接返回
      const user = data[0];
      uni.setStorageSync('pet_user_id', user._id); // 使用 _id 作为用户标识
      return user;
    } else {
      // 3. 用户不存在，创建新用户
      
      // 生成顺序 ID (Axxxxxx)
      let customUserId = '';
      try {
        const { result: idResult } = await wx.cloud.callFunction({
          name: 'getNextUserId',
        });
        customUserId = (idResult as any).userid;
      } catch (e) {
        console.error('Failed to get sequential ID:', e);
        customUserId = `A${Date.now().toString().slice(-6)}`; // Fallback
      }
      
      const newUser = {
        openid,
        userid: customUserId, // 这里的 userid 是我们自定义的 Axxxxxx 格式
        nickname: '微信用户', // 默认为微信用户，后续可引导用户修改
        avatar_url: '',
        is_vip: false,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      };

      const addRes = await db.collection('users').add({
        data: newUser
      });

      const user = {
        ...newUser,
        _id: addRes._id
      };
      
      uni.setStorageSync('pet_user_id', user._id);
      return user;
    }
  } catch (error) {
    console.error('云开发登录失败:', error);
    throw error;
  }
}

// 获取当前用户ID
export const getCurrentUserId = () => {
  return uni.getStorageSync('pet_user_id');
};

// 退出登录
export const logout = () => {
  uni.removeStorageSync('pet_user_id');
};

// 上传图片封装
export async function uploadImage(filePath: string, cloudPath?: string) {
  if (!cloudPath) {
    const ext = filePath.split('.').pop() || 'png';
    const randomName = Math.random().toString(36).slice(2) + Date.now();
    cloudPath = `uploads/${randomName}.${ext}`;
  }
  
  return wx.cloud.uploadFile({
    cloudPath,
    filePath,
  });
}

// 获取图片临时链接（支持多张）
export async function getTempFileURL(fileList: string[]) {
  const result = await wx.cloud.getTempFileURL({
    fileList,
  });
  return result.fileList;
}
