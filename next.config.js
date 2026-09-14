/** @type {import('next').NextConfig} */
const nextConfig = {
  // Caps build worker fan-out. Without this, `next build` can spawn a worker
  // per CPU core and crash with "OS can't spawn worker thread" on machines
  // (containers, low-resource CI, some Windows sandboxes) with restricted
  // thread limits. 2 is enough to still build in parallel without tripping it.
  experimental: {
    cpus: 2,
  },
};

module.exports = nextConfig;
