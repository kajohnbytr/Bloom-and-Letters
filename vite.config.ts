import {existsSync} from 'node:fs'
import {defineConfig} from 'vite'

export default defineConfig({
  define:{
    'import.meta.env.VITE_DEFAULT_GCASH_QR_URL':JSON.stringify(existsSync(new URL('./public/gcash-qr.png',import.meta.url))?'/gcash-qr.png':'')
  },
  build:{
    rollupOptions:{
      output:{
        manualChunks(id){
          if(id.includes('/node_modules/@supabase/'))return 'supabase'
          if(id.includes('/node_modules/framer-motion/')||id.includes('/node_modules/motion-'))return 'motion'
        }
      }
    }
  }
})
