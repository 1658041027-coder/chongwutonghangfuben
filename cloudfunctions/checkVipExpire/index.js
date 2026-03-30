const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const now = new Date().toISOString();
  console.log('Start checking VIP expiration at:', now);

  try {
    // 查找所有 is_vip 为 true 且 vip_expire_at 小于当前时间的记录
    // 注意：vip_expire_at 存储的是 ISO 字符串，可以直接进行字符串比较
    const result = await db.collection('users')
      .where({
        is_vip: true,
        vip_expire_at: _.lt(now)
      })
      .update({
        data: {
          is_vip: false
        }
      });

    console.log(`Updated ${result.stats.updated} users who have expired VIP status.`);

    return {
      success: true,
      updatedCount: result.stats.updated,
      time: now
    };
  } catch (err) {
    console.error('Error updating expired VIPs:', err);
    return {
      success: false,
      error: err
    };
  }
};
