import { beforeEach, describe, expect, it, vi } from 'vitest';
import localDoc from '../../content/agreements/vipRechargeServiceAgreement.zh-CN.json';
import { clearVipRechargeAgreementCache, loadVipRechargeAgreement } from './vipRechargeAgreement';
import { attemptVipRechargePay } from './vipRechargePayGuard';

describe('vipRechargeAgreement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVipRechargeAgreementCache();
  });

  it('缓存未过期时优先使用缓存', async () => {
    const now = Date.now();
    (uni.getStorageSync as any).mockReturnValue({
      fetchedAt: now,
      doc: { ...(localDoc as any), version: 99999999 }
    });

    const doc = await loadVipRechargeAgreement();
    expect(doc.version).toBe(99999999);
    expect((wx.cloud.callFunction as any)).not.toHaveBeenCalled();
  });

  it('缓存过期且远端版本更高时使用远端并更新缓存', async () => {
    const old = Date.now() - 24 * 60 * 60 * 1000 - 1000;
    (uni.getStorageSync as any).mockReturnValue({
      fetchedAt: old,
      doc: localDoc as any
    });

    const remote = { ...(localDoc as any), version: (localDoc as any).version + 1, updatedAt: '2026-03-18' };
    (wx.cloud.callFunction as any).mockResolvedValue({ result: { doc: remote } });

    const doc = await loadVipRechargeAgreement();
    expect(doc.version).toBe(remote.version);
    expect((uni.setStorageSync as any)).toHaveBeenCalled();
  });
});

describe('attemptVipRechargePay', () => {
  it('未勾选时拦截并提示', async () => {
    const toast = vi.fn();
    const pay = vi.fn();

    const ok = await attemptVipRechargePay({
      agreed: false,
      loading: false,
      toast,
      pay
    });

    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledWith('请先同意会员充值服务协议');
    expect(pay).not.toHaveBeenCalled();
  });

  it('已勾选时允许继续执行支付', async () => {
    const toast = vi.fn();
    const pay = vi.fn().mockResolvedValue(undefined);

    const ok = await attemptVipRechargePay({
      agreed: true,
      loading: false,
      toast,
      pay
    });

    expect(ok).toBe(true);
    expect(pay).toHaveBeenCalled();
  });
});

