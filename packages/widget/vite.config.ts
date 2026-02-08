import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'TerminsterWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `booking-widget.${format}.js`,
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: [],
      output: {
        // Global variables for UMD build
        globals: {},
        // Ensure CSS is injected
        inlineDynamicImports: true,
      },
    },
    // Inline all CSS
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
