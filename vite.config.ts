import { existsSync } from "node:fs";
import { defineConfig } from "vite";

const paymentImage = (...names: string[]) => {
  const name = names.find((file) =>
    existsSync(new URL("public/" + file, import.meta.url)),
  );
  return JSON.stringify(name ? "/" + name : "");
};

export default defineConfig({
  define: {
    "import.meta.env.VITE_DEFAULT_GCASH_QR_URL": paymentImage(
      "gcash-qr.jpg",
      "gcash-qr.png",
    ),
    "import.meta.env.VITE_DEFAULT_MARIBANK_QR_URL":
      paymentImage("maribank-qr.jpg"),
    "import.meta.env.VITE_DEFAULT_GOTYME_QR_URL": paymentImage("go-tyme.jpg"),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@supabase/")) return "supabase";
          if (
            id.includes("/node_modules/framer-motion/") ||
            id.includes("/node_modules/motion-")
          )
            return "motion";
        },
      },
    },
  },
});
