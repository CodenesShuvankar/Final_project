/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: '**.scdn.co', // All Spotify CDN domains
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos', // Fallback image service
      },
      {
        protocol: 'https',
        hostname: 'singlecolorimage.com', // Single color placeholder images
      },
    ],
    // Handle broken images gracefully
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig
