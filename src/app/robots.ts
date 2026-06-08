import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/workflow/', '/api/'],
    },
    sitemap: 'https://www.marketping.ai/sitemap.xml',
    host: 'https://www.marketping.ai',
  };
}
