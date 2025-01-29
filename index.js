const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html', 'css', 'js'],
  dotfiles: 'deny'
}));

// Enforce HTTPS
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Security: Content Security Policy (CSP)
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self';");
  next();
});

// Rate Limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Allowed proxy domains (prevent abuse)
const allowedDomains = ['example.com', 'trustedsite.com'];

function isAllowedUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return allowedDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// Utility function to check if input is a valid URL
function isValidUrl(input) {
  try {
    new URL(input);
    return true;
  } catch (e) {
    return false;
  }
}

// Main search page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>💀 Quincy Questions 💀</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-black text-white flex flex-col justify-center items-center h-screen">
  <div class="bg-gray-900 p-6 rounded-lg shadow-lg text-center w-96">
    <h1 class="text-2xl mb-4">Quincy Questions</h1>
    <form action="/search" method="get">
      <input type="text" name="q" placeholder="Enter a search term or URL" required class="w-full p-3 rounded-lg bg-gray-800 text-white">
      <button type="submit" class="mt-3 bg-blue-600 p-2 rounded-lg">Search</button>
    </form>
  </div>
  <footer class="mt-6 text-gray-400">is that iron man? no its a guy in a baby costume 💀</footer>
</body>
</html>
  `);
});

// Search route
app.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query || !validator.isAscii(query)) {
    return res.status(400).send('Invalid search query');
  }

  if (isValidUrl(query)) {
    if (!isAllowedUrl(query)) {
      return res.status(403).send('Forbidden: URL not allowed.');
    }
    res.redirect(`/proxy?url=${encodeURIComponent(query)}`);
  } else {
    searchDuckDuckGo(query, res);
  }
});

// Proxy route with proper URL resolution
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl || !isAllowedUrl(targetUrl)) {
    return res.status(403).send('Forbidden: URL not allowed.');
  }

  try {
    const response = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(targetUrl);

    // Convert relative URLs to absolute ones
    $('a, link[rel="stylesheet"], script, img').each((i, el) => {
      const element = $(el);
      const attr = element.is('img') ? 'src' : 'href';
      let resourceUrl = element.attr(attr);

      if (resourceUrl && !resourceUrl.startsWith('http') && !resourceUrl.startsWith('data:')) {
        resourceUrl = new URL(resourceUrl, baseUrl).toString();
        element.attr(attr, `/proxy?url=${encodeURIComponent(resourceUrl)}`);
      }
    });

    res.send($.html());
  } catch (error) {
    console.error('Error fetching the URL:', error);
    res.status(500).send('Error fetching the URL.');
  }
});

// DuckDuckGo search function with better error handling
async function searchDuckDuckGo(query, res) {
  try {
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        no_redirect: 1,
        skip_disambig: 1,
      },
    });

    const data = response.data;
    if (!data || (!data.Abstract && !data.RelatedTopics.length)) {
      return res.send('<h1>No results found.</h1>');
    }

    let resultsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Search Results for ${query}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-black text-white p-6">
  <h1 class="text-2xl mb-4">Search Results for: ${query}</h1>
  <div class="max-w-2xl mx-auto">
  `;

    if (data.Abstract) {
      resultsHtml += `
        <div class="p-4 bg-gray-900 rounded-lg mb-4">
          <h2 class="text-lg font-bold">${data.Heading}</h2>
          <p>${data.Abstract}</p>
          <a href="/proxy?url=${encodeURIComponent(data.AbstractURL)}" class="text-blue-400">Read more on ${data.AbstractSource}</a>
        </div>
      `;
    }

    resultsHtml += '</div></body></html>';
    res.send(resultsHtml);
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).send('<h1>Error fetching search results. Please try again later.</h1>');
  }
}

// 404 Fallback
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found 💀</h1>');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
});
