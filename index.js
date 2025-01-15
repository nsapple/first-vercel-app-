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
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #000;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .search-container {
      text-align: center;
      padding: 20px;
      background-color: #111;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(255, 255, 255, 0.1);
      width: 400px;
    }
    .search-container h1 {
      font-size: 28px;
      margin-bottom: 20px;
      color: #fff;
    }
    .search-bar {
      position: relative;
      width: 100%;
    }
    .search-bar input {
      width: 100%;
      padding: 12px 50px 12px 20px;
      font-size: 16px;
      border: none;
      border-radius: 24px;
      background-color: #222;
      color: #fff;
      outline: none;
    }
    .search-bar button {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: #333;
      border: none;
      border-radius: 50%;
      padding: 8px;
      cursor: pointer;
    }
    .search-bar button svg {
      width: 20px;
      height: 20px;
      fill: #fff;
    }
    .search-bar button:hover svg {
      fill: #ccc;
    }
    .footer-text {
      position: absolute;
      bottom: 20px;
      text-align: center;
      font-size: 16px;
      color: #bbb;
    }
  </style>
</head>
<body>
  <div class="search-container">
    <h1>Quincy Questions</h1>
    <div class="search-bar">
      <form action="/search" method="get">
        <input type="text" name="q" placeholder="Enter a search term or URL" required>
        <button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </form>
    </div>
  </div>

  <div class="footer-text">
    is that iron man? no its a guy in a baby costume 💀
  </div>
</body>
</html>
  `);
});

// Search route: checks if input is a query or URL
app.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).send('Search query is missing');
  }

  if (isValidUrl(query)) {
    // If it's a valid URL, redirect to proxy
    res.redirect(`/proxy?url=${encodeURIComponent(query)}`);
  } else {
    // Otherwise, search using DuckDuckGo API
    searchDuckDuckGo(query, res);
  }
});

// Proxy route to fetch and display content from a given URL
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('URL is missing');
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

// Function to search using DuckDuckGo API
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
    let resultsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Search Results for ${query}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #000;
      color: #fff;
      padding: 20px;
    }
    .results-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .result {
      background-color: #111;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 5px rgba(255, 255, 255, 0.1);
      margin-bottom: 20px;
    }
    .result h2 {
      margin: 0 0 10px;
      font-size: 20px;
      color: #fff;
    }
    .result p {
      margin: 0;
      color: #ccc;
    }
    .result a {
      color: #007bff;
      text-decoration: none;
    }
    .result a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Search Results for: ${query}</h1>
  <div class="results-container">
    `;

    if (data.Abstract) {
      resultsHtml += `
        <div class="result">
          <h2>${data.Heading}</h2>
          <p>${data.Abstract}</p>
          <a href="/proxy?url=${encodeURIComponent(data.AbstractURL)}" target="_blank">Read more on ${data.AbstractSource}</a>
        </div>
      `;
    }

    resultsHtml += `
  </div>
</body>
</html>
    `;

    res.send(resultsHtml);
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).send('Error fetching search results.');
  }
}

// Fallback route for 404 errors
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found 💀</h1>');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
