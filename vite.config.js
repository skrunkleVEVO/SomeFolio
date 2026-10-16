import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `base: './'` makes every asset path relative, so the same build works at
// https://<user>.github.io/<repo>/ and on a custom domain without changes.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
