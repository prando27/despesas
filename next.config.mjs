/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      { source: "/expenses", destination: "/entries", permanent: false },
      { source: "/expenses/new", destination: "/entries/new", permanent: false },
    ];
  },
};

export default nextConfig;
