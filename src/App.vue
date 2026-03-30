<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
  // 云开发环境初始化已移至 src/lib/cloud.ts 确保加载顺序正确
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
/* 确保页面有背景色 */
page {
  background-color: #f9fafb;
}
</style>
