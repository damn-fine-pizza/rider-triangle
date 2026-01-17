/**
 * Image provider abstraction
 *
 * Currently uses external URLs from moto.suzuki.it
 * Can be evolved to:
 * - Load from local bundle
 * - Use a custom CDN
 * - Proxy through backend
 * - Smart caching
 */

const EXTERNAL_URLS = {
  vstrom: 'https://moto.suzuki.it/modelli/360/v-strom-1050SE/img/data/grade1/color1/19.jpg',
  gsx: 'https://moto.suzuki.it/modelli/360/gsx-s1000gx/img/data/grade1/color1/19.jpg',
};

// Current provider: external URLs
const externalProvider = {
  name: 'external',
  getImageUrl: (bikeKey) => EXTERNAL_URLS[bikeKey] || null,
};

// Future provider example: local bundle
// const localProvider = {
//   name: 'local',
//   getImageUrl: (bikeKey) => `/images/${bikeKey}.jpg`,
// };

// Active provider (can be changed at runtime or via config)
let activeProvider = externalProvider;

export function setImageProvider(provider) {
  activeProvider = provider;
}

export function getImageUrl(bikeKey) {
  return activeProvider.getImageUrl(bikeKey);
}

export function getProviderName() {
  return activeProvider.name;
}

// Export for direct use if needed
export { externalProvider };
