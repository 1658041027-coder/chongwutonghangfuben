import { defineConfig } from "vite";
import uniPlugin from "@dcloudio/vite-plugin-uni";
import UnoCSS from 'unocss/vite'

// @ts-ignore
const uni = uniPlugin.default || uniPlugin;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UnoCSS(),
    uni(),
  ],
});
