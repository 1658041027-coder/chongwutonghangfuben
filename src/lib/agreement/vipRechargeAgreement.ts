import localDoc from '../../content/agreements/vipRechargeServiceAgreement.zh-CN.json';

export type VipRechargeAgreementSection = {
  title: string;
  content: string;
};

export type VipRechargeAgreementDoc = {
  key: string;
  title: string;
  updatedAt: string;
  version: number;
  sections: VipRechargeAgreementSection[];
};

type CachedAgreement = {
  fetchedAt: number;
  doc: VipRechargeAgreementDoc;
};

const STORAGE_KEY = 'vip_recharge_agreement_cache';
const TTL_MS = 24 * 60 * 60 * 1000;

const getStorage = () => {
  if (typeof uni !== 'undefined' && uni.getStorageSync) return uni;
  return null;
};

const canUseCloud = () => typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction;

const getCached = (): CachedAgreement | null => {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getStorageSync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || !parsed.fetchedAt || !parsed.doc) return null;
    return parsed as CachedAgreement;
  } catch {
    return null;
  }
};

const setCached = (cache: CachedAgreement) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setStorageSync(STORAGE_KEY, cache);
  } catch {
    try {
      storage.setStorageSync(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      return;
    }
  }
};

const isFresh = (fetchedAt: number) => Date.now() - fetchedAt < TTL_MS;

const asDoc = (doc: any): VipRechargeAgreementDoc | null => {
  if (!doc || typeof doc !== 'object') return null;
  if (!doc.key || !doc.title || !doc.updatedAt || !doc.version || !Array.isArray(doc.sections)) return null;
  return doc as VipRechargeAgreementDoc;
};

const tryFetchRemote = async (key: string): Promise<VipRechargeAgreementDoc | null> => {
  if (!canUseCloud()) return null;
  try {
    const { result } = await wx.cloud.callFunction({
      name: 'getAgreement',
      data: { key }
    });
    const remote = (result as any)?.doc;
    return asDoc(remote);
  } catch {
    return null;
  }
};

export const loadVipRechargeAgreement = async (opts?: { forceRefresh?: boolean }) => {
  const forceRefresh = Boolean(opts?.forceRefresh);
  const cached = getCached();
  if (!forceRefresh && cached && isFresh(cached.fetchedAt)) return cached.doc;

  const base = asDoc(localDoc) as VipRechargeAgreementDoc;
  const remote = await tryFetchRemote(base.key);

  const selected = remote && (remote.version > base.version || remote.updatedAt > base.updatedAt) ? remote : base;
  setCached({ fetchedAt: Date.now(), doc: selected });
  return selected;
};

export const clearVipRechargeAgreementCache = () => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeStorageSync(STORAGE_KEY);
  } catch {
    return;
  }
};

