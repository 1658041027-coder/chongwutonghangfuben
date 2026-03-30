// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const counterId = 'resource_id_counter'

  try {
    // 1. 原子操作：尝试将计数器自增 1
    const { stats } = await db.collection('counters')
      .doc(counterId)
      .update({
        data: {
          count: db.command.inc(1)
        }
      })
      
    // 2. 如果更新成功 (stats.updated > 0)，直接返回新值
    if (stats.updated > 0) {
      const { data } = await db.collection('counters').doc(counterId).get()
      return { resourceid: data.count }
    } else {
      // 3. 如果更新失败（可能是文档不存在），则初始化
      // 尝试创建计数器，初始值设为 1000
      try {
        await db.collection('counters').add({
          data: {
            _id: counterId,
            count: 1000
          }
        })
        // 初始化后，第一个 ID 就是 1001 (因为下次调用才会自增，或者我们这里直接返回 1001)
        // 为了逻辑简单，我们再次递归调用自己，确保走一遍 inc 逻辑
        return await exports.main(event, context)
      } catch (addErr) {
        // 并发情况下可能别人已经创建了，再次尝试 update
        return await exports.main(event, context)
      }
    }

  } catch (err) {
    console.error('Counter error:', err)
    
    // 如果是“集合不存在”错误，尝试自动创建集合（通常不需要，云开发会自动创建）
    // 但为了保险，我们捕捉这个错误
    if (err.errMsg && (err.errMsg.includes('document not exist') || err.errMsg.includes('update failed'))) {
       // 这里逻辑同上，尝试初始化
       try {
        await db.collection('counters').add({
          data: {
            _id: counterId,
            count: 1000
          }
        })
        return await exports.main(event, context)
      } catch (e) {
        // ignore
      }
    }

    throw err; // 抛出错误让前端知道云函数挂了，而不是默默失败
  }
}