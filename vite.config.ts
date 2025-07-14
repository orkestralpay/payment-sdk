import path from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react-swc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			'~': path.resolve(__dirname, 'src')
		}
	},
	plugins: [
		react(),
		dts({
			insertTypesEntry: true,
			tsconfigPath: './tsconfig.app.json'
		})
	],
	build: {
		lib: {
			name: 'orkestralpay-react',
			fileName: 'orkestralpay-react',
			entry: path.resolve(__dirname, 'src/index.ts')
		},
		rollupOptions: {
			external: ['react', 'react-dom'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM'
				}
			}
		}
	}
});
