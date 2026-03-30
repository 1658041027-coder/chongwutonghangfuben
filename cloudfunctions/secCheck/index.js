// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const { content } = event;
  
  if (!content) {
    return { code: 200, msg: 'ok' };
  }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content
    });
    
    if (res.errCode === 0) {
      return { code: 0, msg: 'ok' };
    } else {
      return { code: 500, msg: '内容包含违规信息' };
    }
  } catch (err) {
    // 错误码 87014: 内容含有违法违规内容
    if (err.errCode === 87014) {
      return { code: 87014, msg: '内容包含敏感信息，请修改' };
    }
    return { code: 500, msg: '内容安全检测失败', err };
  }
}