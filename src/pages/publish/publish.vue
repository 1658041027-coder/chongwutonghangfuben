<script setup lang="ts">
import { ref, watch } from 'vue';
import { onLoad } from "@dcloudio/uni-app";
import { db, _ } from '../../lib/cloud';
import { useUser } from '../../composables/useUser';
import { ArrowLeft, Image as ImageIcon, X, Check, Trash2, ChevronRight } from 'lucide-vue-next';

// Form Data
const form = ref({
  company_name: '',
  city: '',
  contact_name: '',
  phone: '',
  wechat: '',
  category: '',
  sub_category: '',
  description: '',
  requirements: '',
  product_images: [] as string[],
  quote_images: [] as string[]
});

const showCategoryModal = ref(false);
const tempMainCategory = ref('');
const tempSubCategories = ref<string[]>([]);
const loading = ref(false);
const { user, fetchUser } = useUser();

// Category Data
const categories = [
  { name: "源头工厂", subs: ["食品工厂", "用品工厂", "服饰工厂", "玩具工厂", "清洁用品工厂", "药品&保健品工厂", "原料工厂", "猫砂工厂", "设备工厂", "智能用品工厂", "宠物医疗品", "其他"] },
  { name: "繁育商家", subs: ["犬舍", "猫舍", "爬宠&异宠", "水族", "其他"] },
  { name: "品牌方", subs: ["宠物食品", "宠物用品", "宠物药品&保健品", "宠物玩具", "服装饰品", "智能用品", "清洁洗护", "家居休息", "出行便携", "宠物医疗品"] },
  { name: "经销商", subs: ["代理商", "批发商", "供应商", "B2B平台", "其他"] },
  { name: "B端服务", subs: ["宠物技能培训", "宠物云仓", "防伪溯源", "宠物软件系统", "维权控价", "包材工厂", "检测服务", "品牌设计服务", "运营&推广", "其他"] },
  { name: "全域电商", subs: ["私域电商", "跨境电商", "公域电商", "快团团", "其他"] },
  { name: "本地商家", subs: ["宠物店", "宠物医院", "宠物乐园", "宠物学校", "宠物用品店", "宠物服务综合体", "猫咖&狗咖", "其他", "宠物酒店"] },
  { name: "新兴服务", subs: ["宠物活动&旅游", "宠物展会", "宠物托运&出行", "宠物克隆", "宠物殡葬", "宠物保险", "宠物摄影", "宠物小程序", "宠物O20服务", "宠物烘培", "其他", "招聘平台"] },
  { name: "媒体达人", subs: ["宠物博主", "宠物社群", "代运营机构", "MCN机构", "行业媒体", "其他", "综合平台", "训犬师"] },
  { name: "行业组织", subs: ["动保协会", "公益领养", "行业协会"] }
];

onLoad(() => {
  fetchUser();
});

// Category Modal Logic
const openCategoryModal = () => {
  if (form.value.category) {
    tempMainCategory.value = form.value.category;
    tempSubCategories.value = form.value.sub_category ? form.value.sub_category.split(',') : [];
  } else {
    tempMainCategory.value = categories[0].name;
    tempSubCategories.value = [];
  }
  showCategoryModal.value = true;
};

const selectMainCategory = (cat: string) => {
  if (tempMainCategory.value !== cat) {
    tempMainCategory.value = cat;
    tempSubCategories.value = []; 
  }
};

const toggleSubCategory = (sub: string) => {
  const index = tempSubCategories.value.indexOf(sub);
  if (index > -1) {
    tempSubCategories.value.splice(index, 1);
  } else {
    tempSubCategories.value.push(sub);
  }
};

const confirmCategory = () => {
  form.value.category = tempMainCategory.value;
  form.value.sub_category = tempSubCategories.value.join(',');
  showCategoryModal.value = false;
};

const getSubCategoriesForMain = (mainCat: string) => {
  return categories.find(c => c.name === mainCat)?.subs || [];
};

const clearCategory = () => {
  form.value.category = '';
  form.value.sub_category = '';
};

// Submit Logic
const submit = async () => {
  if (!form.value.company_name || !form.value.city || !form.value.contact_name || !form.value.category || !form.value.description || !form.value.requirements) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }
  if (!form.value.phone && !form.value.wechat) {
    uni.showToast({ title: '手机和微信至少填写一项', icon: 'none' });
    return;
  }

  loading.value = true;

  try {
    if (!user.value) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      // TODO: Navigate to login page when available
      return;
    }

    // Check VIP status
    const userRes = await db.collection('users').doc(user.value._id).get();
    const userData = userRes.data;

    if (!userData?.is_vip) {
      uni.showModal({
        title: '提示',
        content: '发布需求需要开通会员权限，是否前往开通？',
        confirmText: '去开通',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/vip/vip' });
          }
        }
      });
      return;
    }

    // Check resource count for VIP
    const countRes = await db.collection('resources')
      .where({
        user_id: user.value._id
      })
      .count();
    
    const count = countRes.total;

    if (count >= 2) {
      uni.showToast({ title: '会员最多只能发布两条需求', icon: 'none' });
      return;
    }

    // 1. 获取递增的资源 ID (1000+)
    let resourceid = 0;
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getNextResourceId'
      });
      // 检查结果有效性
      if (result && (result as any).resourceid) {
        resourceid = (result as any).resourceid;
      } else {
        throw new Error('Cloud function returned empty resourceid');
      }
    } catch (e: any) {
      console.error('Failed to get resource ID:', e);
      uni.showModal({
        title: '生成ID失败',
        content: `云函数调用异常：${e.message || e.errMsg || JSON.stringify(e)}，请检查云函数是否部署`,
        showCancel: false
      });
      loading.value = false;
      return; // 终止发布，避免生成错误的ID
    }

    await db.collection('resources').add({
      data: {
        user_id: user.value._id,
        resourceid: resourceid,
        company_name: form.value.company_name,
        city: form.value.city,
        contact_name: form.value.contact_name,
        phone: form.value.phone,
        wechat: form.value.wechat,
        category: form.value.category,
        sub_category: form.value.sub_category,
        description: form.value.description,
        requirements: form.value.requirements,
        product_images: form.value.product_images,
        quote_images: form.value.quote_images,
        status: 'approved',
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    });

    uni.showToast({ title: '发布成功', icon: 'success' });
    
    // Set flag to refresh home page
    uni.setStorageSync('should_refresh_home', true);
    
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' });
    }, 1500);

  } catch (e: any) {
    console.error('Error submitting:', e);
    uni.showToast({ title: e.message || '发布失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  uni.navigateBack();
};
</script>

<template>
  <view class="pb-20 bg-gray-50 min-h-screen">
    <!-- Navbar -->
    <view class="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
      <view class="flex items-center" @click="goBack">
        <!-- Back button usually hidden in tabbar pages, but good to have if navigated to -->
      </view>
      <view class="w-5"></view>
    </view>

    <view class="p-4 space-y-4">
      <!-- Basic Info -->
      <view class="bg-white p-4 rounded-xl space-y-4">
        <text class="text-sm font-bold text-gray-500 mb-2 block">基本信息</text>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">品牌/公司/产品名称 <text class="text-red-500">*</text></text>
          <input v-model="form.company_name" type="text" class="w-full border border-gray-200 rounded-lg p-2 text-sm" placeholder="请输入名称" placeholder-class="text-gray-400" />
        </view>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">所在城市 <text class="text-red-500">*</text></text>
          <input v-model="form.city" type="text" class="w-full border border-gray-200 rounded-lg p-2 text-sm" placeholder="例如：上海" placeholder-class="text-gray-400" />
        </view>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">职位身份&姓名 <text class="text-red-500">*</text></text>
          <input v-model="form.contact_name" type="text" class="w-full border border-gray-200 rounded-lg p-2 text-sm" placeholder="例如：王经理" placeholder-class="text-gray-400" />
        </view>
      </view>

      <!-- Contact Info -->
      <view class="bg-white p-4 rounded-xl space-y-4">
        <view class="flex flex-row justify-between items-center mb-2">
          <text class="text-sm font-bold text-gray-500">联系方式 (至少填一项)</text>

        </view>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">手机号</text>
          <input v-model="form.phone" type="number" class="w-full border border-gray-200 rounded-lg p-2 text-sm" placeholder="请输入手机号" placeholder-class="text-gray-400" />
        </view>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">微信号</text>
          <input v-model="form.wechat" type="text" class="w-full border border-gray-200 rounded-lg p-2 text-sm" placeholder="请输入微信号" placeholder-class="text-gray-400" />
        </view>
      </view>

      <!-- Category -->
      <view class="bg-white p-4 rounded-xl space-y-4">
        <view class="flex flex-row justify-between items-center mb-2">
          <text class="text-sm font-bold text-gray-500">业务类别 <text class="text-red-500">*</text></text>
          <view v-if="form.category" class="flex flex-row items-center space-x-1" @click.stop="clearCategory">
            <Trash2 :size="14" class="text-gray-400" />
            <text class="text-xs text-gray-400">清空</text>
          </view>
        </view>
        <view @click="openCategoryModal" class="border border-gray-200 rounded-lg p-3 flex flex-row justify-between items-center active:bg-gray-50 transition-colors">
           <view class="flex-1 overflow-hidden">
             <text v-if="form.category" class="text-gray-800 text-sm font-medium block">{{ form.category }}</text>
             <text v-else class="text-gray-400 text-sm block">请选择业务类型</text>
             
             <view v-if="form.sub_category" class="mt-1 flex flex-row flex-wrap gap-1">
               <text v-for="sub in form.sub_category.split(',')" :key="sub" class="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">
                 {{ sub }}
               </text>
             </view>
           </view>
           <ChevronRight class="text-gray-400 ml-2" :size="16" />
        </view>
      </view>

      <!-- Description -->
      <view class="bg-white p-4 rounded-xl space-y-4">
        <text class="text-sm font-bold text-gray-500 mb-2 block">详细介绍</text>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">品牌/产品/服务描述 <text class="text-red-500">*</text></text>
          <textarea 
            v-model="form.description" 
            class="w-full border border-gray-200 rounded-lg p-3 text-base h-40" 
            placeholder="请输入详细描述，便于同行搜索" 
            placeholder-class="text-gray-400" 
            maxlength="-1"
            :show-confirm-bar="false"
            :disable-default-padding="true"
          ></textarea>
        </view>
        <view>
          <text class="block text-sm font-medium text-gray-700 mb-1">合作需求 <text class="text-red-500">*</text></text>
          <textarea 
            v-model="form.requirements"
            class="w-full border border-gray-200 rounded-lg p-3 text-base h-40" 
            placeholder="请输入您需要找的资源或客户" 
            placeholder-class="text-gray-400" 
            maxlength="-1"
            :show-confirm-bar="false"
            :disable-default-padding="true"
          ></textarea>
        </view>
      </view>

      <!-- Submit Button -->
      <button 
        @click="submit" 
        :disabled="loading"
        class="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg active:opacity-90 transition-opacity disabled:opacity-50"
      >
        {{ loading ? '发布中...' : '立即发布' }}
      </button>
    </view>

    <!-- Category Modal (Using fixed position view as overlay) -->
    <view v-if="showCategoryModal" class="fixed inset-0 z-50 flex flex-col bg-black/50">
      <view class="flex-1" @click="showCategoryModal = false"></view>
      <view class="bg-white rounded-t-xl h-[80vh] flex flex-col w-full">
        <!-- Header -->
        <view class="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <view class="flex flex-row items-center space-x-2">
            <X class="text-gray-500" :size="24" @click="showCategoryModal = false" />
            <text class="font-bold text-lg">选择你的业务类型</text>
          </view>
          <button 
            @click="confirmCategory" 
            class="bg-orange-500 text-white text-sm px-4 py-1.5 rounded-full font-medium leading-none m-0"
            :disabled="!tempMainCategory || tempSubCategories.length === 0"
            style="line-height: 2;"
          >
            确定
          </button>
        </view>
        
        <!-- Tip -->
        <view class="p-2 bg-gray-50 text-xs text-gray-500 text-center">
          只可选一类主营业务，子类可多选
        </view>
        
        <!-- Content -->
        <view class="flex-1 flex flex-row overflow-hidden">
          <!-- Left Sidebar -->
          <scroll-view scroll-y class="w-1/3 bg-gray-100 h-full">
            <view 
              v-for="cat in categories" 
              :key="cat.name"
              @click="selectMainCategory(cat.name)"
              class="relative px-4 py-4 text-sm font-medium transition-colors"
              :class="tempMainCategory === cat.name ? 'bg-white text-orange-500 border-l-4 border-orange-500' : 'text-gray-600 border-l-4 border-transparent'"
            >
              {{ cat.name }}
              <view v-if="tempMainCategory === cat.name && tempSubCategories.length > 0" class="absolute top-2 right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {{ tempSubCategories.length }}
              </view>
            </view>
          </scroll-view>
          
          <!-- Right Content -->
          <scroll-view scroll-y class="w-2/3 bg-white h-full p-4">
            <view class="space-y-4 pb-10">
               <view 
                 v-for="sub in getSubCategoriesForMain(tempMainCategory)" 
                 :key="sub"
                 @click="toggleSubCategory(sub)"
                 class="flex flex-row items-center justify-between py-3 border-b border-gray-50 last:border-0"
               >
                 <text class="text-sm" :class="tempSubCategories.includes(sub) ? 'text-gray-800 font-bold' : 'text-gray-600'">{{ sub }}</text>
                 <Check v-if="tempSubCategories.includes(sub)" class="text-red-500" :size="18" />
               </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
/* Custom styles if needed */
.bg-primary {
  background-color: #FF6B35;
}
.border-primary {
  border-color: #FF6B35;
}
</style>