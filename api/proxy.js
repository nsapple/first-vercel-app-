const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Utility function to check if input is a valid URL
function isValidUrl(input) {
  try {
    new URL(input);
    return true;
  } catch (e) {
    return false;
  }
}

// Proxy route to fetch and display content from a given URL
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res.status(400).send('Valid URL is required');
  }

  try {
    // Fetch the target URL content
    const response = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);

    // Proxy all links
    $('a').each((i, el) => {
      const element = $(el);
      const href = element.attr('href');
      if (href && href.startsWith('http')) {
        element.attr('href', `/proxy?url=${encodeURIComponent(href)}`);
      }
    });

    // Proxy images, scripts, and stylesheets
    $('link[rel="stylesheet"], script, img').each((i, el) => {
      const element = $(el);
      const attr = element.is('img') ? 'src' : 'href';
      const resourceUrl = element.attr(attr);

      if (resourceUrl && !resourceUrl.startsWith('http')) {
        element.attr(attr, `/proxy?url=${new URL(resourceUrl, targetUrl).toString()}`);
      }
    });

    res.send($.html());
  } catch (error) {
    console.error('Error fetching the URL:', error);
    res.status(500).send('Error fetching the URL.');
  }
});

// Fallback route for 404 errors
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found 💀</h1>');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
