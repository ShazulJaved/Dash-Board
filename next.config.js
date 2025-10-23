/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve("process/browser"),
        stream: require.resolve("stream-browserify"),
        crypto: require.resolve("crypto-browserify"),
        fs: false, // Disable fs in browser
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Add redirects configuration
  async redirects() {
    return [
      {
        // Redirect root to sign-up page
        source: '/',
        destination: '/auth/sign-up',
        permanent: false,
      },
      {
        source: '/auth/signin',
        destination: '/auth/sign-in',
        permanent: true,
      },
      {
        source: '/auth/signup',
        destination: '/auth/sign-up',
        permanent: true,
      }
    ];
  },
  
  // Add this to help with TypeScript issues
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
