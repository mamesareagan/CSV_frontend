import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react' // Uncomment if you add React later

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // react(), // Uncomment this line if you start using React
  ],
  server: {
    port: 5670, // Match your frontend port
    host: 'localhost', // Ensure it binds to localhost
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Backend server
        changeOrigin: true, // Adjusts Host header to match target
        secure: false, // Allow non-HTTPS for local dev
      },
    },
  },
});
