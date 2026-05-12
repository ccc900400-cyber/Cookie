import express from 'express';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route for fetching links
  app.post('/api/fetch-link', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      console.log(`[Server] Fetching link: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        timeout: 10000,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Specific handling for WeChat links
      let content = '';
      if (url.includes('mp.weixin.qq.com')) {
        content = $('#js_content').text().trim();
        // Fallback or additional info
        if (!content) {
          content = $('body').text().trim();
        }
        // Also get title
        const title = $('.rich_media_title').text().trim() || $('title').text().trim();
        if (title) {
          content = `Title: ${title}\n\nContent:\n${content}`;
        }
      } else {
        // Generic parsing
        $('script, style, nav, footer, header').remove();
        content = $('body').text().trim();
      }

      // Limit content size
      const limitedContent = content.substring(0, 30000); // 30k chars should be enough for analysis

      res.json({ content: limitedContent });
    } catch (error: any) {
      console.error('[Server] Fetch error:', error.message);
      res.status(500).json({ error: 'Failed to fetch link content: ' + error.message });
    }
  });

  // API routes go here
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

startServer();
