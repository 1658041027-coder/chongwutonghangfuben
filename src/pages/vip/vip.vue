<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { db, CLOUD_ENV_ID } from '../../lib/cloud';
import { useUser } from '../../composables/useUser';
import VipRechargeAgreementModal from '../../components/VipRechargeAgreementModal.vue';
import { loadVipRechargeAgreement } from '../../lib/agreement/vipRechargeAgreement';
import type { VipRechargeAgreementDoc } from '../../lib/agreement/vipRechargeAgreement';
import { attemptVipRechargePay } from '../../lib/agreement/vipRechargePayGuard';

const { user, fetchUser, updateUser } = useUser();
const loading = ref(false);
const agreed = ref(false);
const agreementVisible = ref(false);
const agreementDoc = ref<VipRechargeAgreementDoc | null>(null);

const plans = [
  { id: 1, name: '月卡会员', price: 29, duration: 30, desc: '短期体验' },
  { id: 2, name: '季卡会员', price: 79, duration: 90, desc: '超值特惠', recommend: true },
  { id: 3, name: '年卡会员', price: 299, duration: 365, desc: '长期陪伴' },
];

const selectedPlan = ref(plans[1]);

const ensureAgreementLoaded = async () => {
  if (agreementDoc.value) return;
  agreementDoc.value = await loadVipRechargeAgreement();
};

const openAgreement = async () => {
  await ensureAgreementLoaded();
  agreementVisible.value = true;
};

const onAgreementAgree = () => {
  agreed.value = true;
  if (agreementDoc.value) {
    uni.setStorageSync('vip_recharge_agreement_accepted', {
      version: agreementDoc.value.version,
      acceptedAt: Date.now()
    });
  }
};

const calculateValidity = (duration: number) => {
  const now = new Date();
  const end = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
  
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}年${m}月${d}日`;
  };

  return `${formatDate(now)}-${formatDate(end)}`;
};

const onPayTap = async () => {
  await attemptVipRechargePay({
    agreed: agreed.value,
    loading: loading.value,
    toast: (msg) => uni.showToast({ title: msg, icon: 'none' }),
    pay
  });
};

const pay = async () => {
  // Use _id which is standard for Cloud Development
  if (!user.value || !user.value._id) {
    // Try to recover from local storage
    const storedId = uni.getStorageSync('pet_user_id');
    if (storedId) {
      // If we have a stored ID but no user object, try to fetch it quickly
      await fetchUser();
    } else {
      uni.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    // Check again
    if (!user.value || !user.value._id) {
       uni.showToast({ title: '请先登录', icon: 'none' });
       return;
    }
  }

  loading.value = true;

  try {
    // ---------------------------------------------------------------------------------
    // 第一步：调用云函数下单 (免鉴权)
    // ---------------------------------------------------------------------------------
    
    // 【配置项】请替换为你的真实信息
    const SUB_MCH_ID = '1106890648';         // 微信支付商户号(已在云开发后台绑定)

    uni.showLoading({ title: '正在创建订单...' });
    
    const { result } = await wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalFee: Math.floor(selectedPlan.value.price * 100), // 确保是整数
        orderTitle: `开通${selectedPlan.value.name}`,
        envId: CLOUD_ENV_ID,
        subMchId: SUB_MCH_ID,
        // 关键：传入业务数据
        attachData: {
          type: 'vip', // 标记为VIP充值
          userId: user.value._id,
          planId: selectedPlan.value.id,
          duration: selectedPlan.value.duration
        }
      }
    });

    if (!result || !result.success || !result.payment) {
      throw new Error(result?.errMsg || '云函数下单失败');
    }

    const { payment, outTradeNo } = result;

    // ---------------------------------------------------------------------------------
    // 第二步：调用微信支付核心接口
    // ---------------------------------------------------------------------------------
    uni.requestPayment({
      ...payment, // 包含 timeStamp, nonceStr, package, signType, paySign
      package: payment.package, // Ensure package is explicitly passed if missing in spread
      
      // 支付成功回调
      success: async (res) => {
        console.log('支付成功', res);
        uni.hideLoading(); // Hide loading first to avoid hiding the toast
        uni.showLoading({ title: '确认权益中...' });
        
        // -----------------------------------------------------------------------------
        // 第三步：支付成功后的业务处理
        // -----------------------------------------------------------------------------
        
        // (模拟) 更新数据库 VIP 状态
        // 注意：真实场景建议在 payCallback 云函数中操作数据库，前端仅做展示更新
        try {
          await db.collection('users').doc(user.value._id).update({
            data: {
              is_vip: true,
              vip_level: selectedPlan.value.id,
              vip_expire_at: new Date(Date.now() + selectedPlan.value.duration * 24 * 60 * 60 * 1000).toISOString()
            }
          });
          
          uni.hideLoading();
          uni.showToast({ title: '开通成功！', icon: 'success' });
          if (user.value) user.value.is_vip = true;
          setTimeout(() => uni.navigateBack(), 1500);
        } catch (err) {
          console.error('更新权益失败', err);
          uni.hideLoading();
          uni.showToast({ title: '权益更新延迟，请稍后刷新', icon: 'none' });
        }
      },
      
      fail: (err) => {
        console.error('支付失败', err);
        uni.hideLoading(); // Ensure loading is hidden BEFORE showing toast
        if (err.errMsg.indexOf('cancel') > -1) {
          uni.showToast({ title: '支付已取消', icon: 'none' });
        } else {
          uni.showToast({ title: '支付失败', icon: 'none' });
        }
      },
      
      complete: () => {
        loading.value = false;
        // Don't call hideLoading here as it might hide the success/fail toast
      }
    });

  } catch (error: any) {
    console.error('下单异常', error);
    // 识别 FunctionName parameter could not be found 错误
    if (error.message && error.message.includes('FunctionName parameter could not be found')) {
      uni.showModal({
        title: '云函数未部署',
        content: '请在微信开发者工具中右键 cloudfunctions/createOrder 文件夹，选择【上传并部署：云端安装依赖】',
        showCancel: false
      });
    } else {
      uni.showToast({ title: '下单失败，请重试', icon: 'none' });
    }
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    await ensureAgreementLoaded();
  } catch {
    return;
  }
});
</script>

<template>
  <view class="bg-gray-900 min-h-screen pb-20 text-white">
    <!-- 顶部占位，颜色与背景一致，防止白条 -->
    <view class="h-[var(--status-bar-height)] w-full bg-gray-900"></view>
    
    <!-- User Info -->
    <view class="px-6 py-4 flex flex-row items-center space-x-3 mt-4">
      <view class="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
        <text class="text-2xl text-yellow-400">👑</text>
      </view>
      <view class="flex-1">
        <view class="font-bold text-lg text-white">升级VIP会员</view>
        <view class="text-xs text-gray-400">解锁更多同行资源权限</view>
      </view>
    </view>

    <!-- Benefits -->
    <view class="px-4 py-6">
      <view class="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <view class="font-bold text-yellow-400 mb-4 text-center text-lg">VIP 专属权益</view>
        <view class="grid grid-cols-2 gap-4">
          <view class="flex flex-row items-center space-x-2">
            <view class="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <text class="text-xs text-yellow-400">✓</text>
            </view>
            <text class="text-sm text-gray-300">查看联系方式</text>
          </view>
          <view class="flex flex-row items-center space-x-2">
            <view class="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <text class="text-xs text-yellow-400">✓</text>
            </view>
            <text class="text-sm text-gray-300">优先展示排名</text>
          </view>
          <view class="flex flex-row items-center space-x-2">
            <view class="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <text class="text-xs text-yellow-400">✓</text>
            </view>
            <text class="text-sm text-gray-300">可发布两条需求</text>
          </view>
          <view class="flex flex-row items-center space-x-2">
            <view class="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <text class="text-xs text-yellow-400">✓</text>
            </view>
            <text class="text-sm text-gray-300">专属客服服务</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Plans -->
    <view class="px-4 pb-24">
      <view class="font-bold mb-4 px-2 text-lg text-white">选择套餐</view>
      <view class="space-y-3">
        <view 
          v-for="plan in plans" 
          :key="plan.id"
          @click="selectedPlan = plan"
          class="relative p-4 rounded-xl border-2 transition-all flex flex-row justify-between items-center mb-3"
          :class="selectedPlan.id === plan.id ? 'bg-gray-800 border-yellow-400' : 'bg-gray-800 border-transparent opacity-80'"
        >
          <view v-if="plan.recommend" class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full z-10">
            推荐
          </view>
          <view>
            <view class="font-bold text-lg text-white">{{ plan.name }}</view>
            <view class="text-xs text-gray-400 mt-1">{{ plan.desc }}</view>
            <view class="text-xs text-gray-500 mt-1">有效期: {{ calculateValidity(plan.duration) }}</view>
          </view>
          <view class="text-right">
            <view class="text-2xl font-bold text-yellow-400">¥{{ plan.price }}</view>
            <view class="text-xs text-gray-500 line-through">¥{{ Math.floor(plan.price * 1.5) }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- Footer Action -->
    <view class="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 border-t border-gray-700 pb-safe z-50">
      <view class="flex flex-row items-center space-x-2 mb-3" @click="agreed = !agreed">
        <view
          class="w-20 h-20 border-2 flex items-center justify-center"
          :class="agreed ? 'bg-[#0066FF] border-[#0066FF]' : 'bg-white/10 border-gray-300'"
          @click.stop="agreed = !agreed"
        >
          <text v-if="agreed" class="text-[14px] text-white font-bold leading-none">✓</text>
        </view>
        <text class="text-xs text-gray-300">我已阅读并同意</text>
        <text class="text-xs text-[#0066FF] underline" @click.stop="openAgreement">《会员充值服务协议》</text>
      </view>
      <button 
        @click="onPayTap"
        :disabled="loading"
        class="w-full text-gray-900 font-bold py-3 rounded-full shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 border-none"
        :class="agreed ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-500'"
      >
        {{ loading ? '支付中...' : `立即开通 ¥${selectedPlan.price}` }}
      </button>
    </view>
    <VipRechargeAgreementModal v-model="agreementVisible" :doc="agreementDoc" @agree="onAgreementAgree" />
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
button {
  color: #111827; /* gray-900 */
}
</style>
