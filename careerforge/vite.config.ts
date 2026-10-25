import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], test: { env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_AI_ENABLED: 'false' }, globals: true, environment: 'jsdom', include: ['tests/unit/**/*.test.ts?(x)'] } });
