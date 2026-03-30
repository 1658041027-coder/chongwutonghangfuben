const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { returnCode, resultCode, outTradeNo, totalFee, attach } = event;

  // 验证支付结果
  if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS') {
  // 初始化数据库
  const db = cloud.database();

  try {
    // 1. 处理业务逻辑 (VIP/提示词)
    let attachData = {};
    try {
      attachData = JSON.parse(attach || '{}');
    } catch (e) {
      console.error('Failed to parse attach data:', e);
    }

    if (attachData.type === 'vip') {
      // VIP购买逻辑
      await db.collection('users').doc(attachData.userId).update({
        data: {
          is_vip: true,
          vip_level: attachData.planId,
          vip_expire_at: new Date(Date.now() + attachData.duration * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } else if (attachData.type === 'prompt') {
      // 提示词充值逻辑
      await db.collection('users').doc(attachData.userId).update({
        data: {
          prompt_count: db.command.inc(attachData.promptCount || 0)
        }
      });
    }

    // 2. 更新订单状态为 SUCCESS
    await db.collection('orders').where({
      outTradeNo: outTradeNo
    }).update({
      data: {
        status: 'SUCCESS',
        payTime: db.serverDate(),
        transactionId: event.transactionId || '' // 微信支付单号
      }
    });
    
    console.log(`订单 ${outTradeNo} 支付成功，类型: ${attachData.type}，金额: ${totalFee}`);
    return { errcode: 0, errmsg: 'SUCCESS' };
  } catch (dbErr) {
    console.error('Database update failed:', dbErr);
    return { errcode: 0, errmsg: 'SUCCESS' }; // 即使数据库更新失败，也告诉微信成功，避免重复回调
  }
};
  }
  
  return { errcode: -1, errmsg: 'FAIL' };
};
