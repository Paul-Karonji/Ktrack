import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [react(), viteTsconfigPaths()],
    esbuild: {
        loader: "tsx",
        include: /src\/.*\.[tj]sx?$/,
        exclude: [],
    },

    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            }
        },
    },
    build: {
        outDir: 'build', // Maintain 'build' folder for compatibility
    },
});
