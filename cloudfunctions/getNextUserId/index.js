// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const counterId = 'user_id_counter'
  const collectionName = 'counters' // 统一集合名称

  try {
    // 1. 原子操作：尝试将计数器自增 1
    const { stats } = await db.collection(collectionName)
      .doc(counterId)
      .update({
        data: {
          count: db.command.inc(1)
        }
      })
      
    // 2. 如果更新成功，直接返回新值
    if (stats.updated > 0) {
      const { data } = await db.collection(collectionName).doc(counterId).get()
      
      // 生成随机后缀 (A-Z)
      const randomSuffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      
      // 格式化为 AxxxxxxX (A + 6位数字 + 1位随机字母)
      const userid = `A${String(data.count).padStart(6, '0')}${randomSuffix}`
      return { userid }
    } else {
      // 3. 如果更新失败（文档不存在），则初始化
      try {
        await db.collection(collectionName).add({
          data: {
            _id: counterId,
            count: 100000 // 初始值
          }
        })
        // 初始化后，递归调用一次
        return await exports.main(event, context)
      } catch (addErr) {
         // 并发情况下可能别人已经创建了，再次尝试 update
         return await exports.main(event, context)
      }
    }

  } catch (err) {
    console.error('Counter error:', err)
    
    // 如果是“集合不存在”错误，尝试自动创建集合
    if (err.errMsg && (err.errMsg.includes('document not exist') || err.errMsg.includes('update failed'))) {
       try {
        await db.collection(collectionName).add({
          data: {
            _id: counterId,
            count: 100000
          }
        })
        return await exports.main(event, context)
      } catch (e) {
        // ignore
      }
    }

    throw err; // 抛出错误，前端处理
  }
}