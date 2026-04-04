import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		external: ['bun:sqlite', 'fs', 'path', 'crypto']
	},
	build: {
		rollupOptions: {
			external: ['bun:sqlite']
		}
	},
	server: {
		open: true
	}
});
