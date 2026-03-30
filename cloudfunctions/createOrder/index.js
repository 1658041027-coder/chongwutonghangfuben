const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { totalFee, orderTitle, subMchId, envId, attachData } = event;
  
  console.log('[createOrder] 接收到的参数:', event); // 添加日志

  // 参数校验
  const finalTotalFee = parseInt(totalFee);
  if (isNaN(finalTotalFee) || finalTotalFee <= 0) {
    console.error('[createOrder] 金额参数错误:', totalFee);
    return {
      success: false,
      errMsg: `支付金额无效: ${totalFee} (期望是大于0的整数)`
    };
  }

  // 生成唯一订单号
  const outTradeNo = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    // 1. 在数据库中创建订单记录 (状态: PENDING)
    // 注意：需要先在云数据库创建 'orders' 集合
    await db.collection('orders').add({
      data: {
        outTradeNo: outTradeNo,
        status: 'PENDING', // PENDING, SUCCESS, FAIL
        totalFee: finalTotalFee,
        title: orderTitle || "商品购买",
        userId: attachData.userId || '',
        attachData: attachData,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 2. 调用免鉴权支付接口
    const res = await cloud.cloudPay.unifiedOrder({
      "body": orderTitle || "商品购买",
      "outTradeNo": outTradeNo,
      "spbillCreateIp": "127.0.0.1",
      "subMchId": subMchId,        
      "totalFee": finalTotalFee, 
      "envId": envId,              
      "functionName": "payCallback", 
      // 关键：将业务数据（如购买类型、商品ID、用户ID）放入 attach 字段，回调时会原样返回
      "attach": JSON.stringify(attachData || {}) 
    });

    console.log('[CloudPay] unifiedOrder result:', res);

    // 增加 resultCode 的检查
    if (res.resultCode === 'FAIL') {
        throw new Error(res.errCodeDes || res.returnMsg || '支付下单失败');
    }

    if (!res || !res.payment) {
        throw new Error('UnifiedOrder failed, no payment info returned: ' + JSON.stringify(res));
    }

    return {
      success: true,
      payment: res.payment, // 包含前端所需的支付参数
      outTradeNo: outTradeNo
    };
  } catch (err) {
    console.error("CloudPay Error:", err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};
