/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.unsplash.com', 
      'via.placeholder.com',
      'i.scdn.co',              // Spotify album art
      'mosaic.scdn.co',         // Spotify playlist covers
      'lineup-images.scdn.co',  // Spotify artist images
      'thisis-images.scdn.co',  // Spotify "This Is" playlist covers
      'charts-images.scdn.co',  // Spotify charts images
      'daily-mix.scdn.co',      // Spotify Daily Mix covers
      'seed-mix-image.scdn.co', // Spotify mix covers
    ],
  },
}

module.exports = nextConfig
