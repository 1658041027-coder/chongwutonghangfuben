export const attemptVipRechargePay = async (opts: {
  agreed: boolean;
  loading: boolean;
  toast: (msg: string) => void;
  pay: () => Promise<void>;
}) => {
  if (opts.loading) return false;
  if (!opts.agreed) {
    opts.toast('请先同意会员充值服务协议');
    return false;
  }
  await opts.pay();
  return true;
};

