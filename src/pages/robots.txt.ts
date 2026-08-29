import type { APIRoute } from 'astro'
import b12Context from '../b12Context.json'

const stagingRobotsTxt = `\
User-agent: *
Disallow: /
`

const productionRobotsTxt = `\
User-agent: *
Disallow: /dist/
`

const getRobotsTxt = (sitemapURL: URL) => `${b12Context.is_preview ? stagingRobotsTxt : productionRobotsTxt
  }
Sitemap: ${sitemapURL.href}
`

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL('sitemap-index.xml', site)
  return new Response(getRobotsTxt(sitemapURL))
}
