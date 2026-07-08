import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.scansafe.co.in'

  // Define static routes
  const routes = [
    '',
    '/scan',
    '/pricing',
    '/pitch',
    '/contact',
    '/privacy',
    '/terms',
    '/refund',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return [...routes]
}
