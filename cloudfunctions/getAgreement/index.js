const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const key = event && event.key
  if (!key) return { success: false, doc: null }

  try {
    const res = await db.collection('agreements').doc(key).get()
    if (!res || !res.data) return { success: true, doc: null }
    return { success: true, doc: res.data }
  } catch (e) {
    return { success: true, doc: null }
  }
}

