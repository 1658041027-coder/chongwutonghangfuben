import { config } from '@vue/test-utils';

config.global.config = config.global.config || {};
config.global.config.compilerOptions = config.global.config.compilerOptions || {};
config.global.config.compilerOptions.isCustomElement = (tag) =>
  ['view', 'text', 'image', 'scroll-view', 'button', 'input'].includes(tag);

(globalThis as any).uni = {
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  navigateTo: vi.fn(),
  switchTab: vi.fn(),
  stopPullDownRefresh: vi.fn()
};

(globalThis as any).wx = {
  cloud: {
    callFunction: vi.fn()
  }
};
