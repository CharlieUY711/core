/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@core/core",
    "@core/db",
    "@core/design-system"
  ]
}

module.exports = nextConfig
