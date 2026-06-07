/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@core/i18n', '@core/auth', '@core/ui', '@core/design'],
}
module.exports = nextConfig
