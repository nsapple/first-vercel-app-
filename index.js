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
  <title>DuckDuckGo Proxy Search</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f8f9fa;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .search-container {
      text-align: center;
      padding: 20px;
      background-color: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    .search-bar {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .search-bar input {
      width: 60%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 24px;
      outline: none;
    }
    .search-bar button {
      padding: 12px 20px;
      margin-left: -40px;
      background-color: #007bff;
      color: #fff;
      border: none;
      border-radius: 24px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="search-container">
    <h1>DuckDuckGo Proxy Search</h1>
    <div class="search-bar">
      <form action="/search" method="get">
        <input type="text" name="q" placeholder="Enter a search term or URL" required>
        <button type="submit">Search</button>
      </form>
    </div>
  </div>
</body>
</html>
  `);
});

// Search route using DuckDuckGo's Instant Answer API
app.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).send('Search query is missing');
  }

  // Check if it's a valid URL
  if (isValidUrl(query)) {
    // Proxy the URL content
    res.redirect(`/proxy?url=${encodeURIComponent(query)}`);
  } else {
    // Fetch data from DuckDuckGo's Instant Answer API
    try {
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
        },
      });

      const data = response.data;

      // Build the result page
      let resultsHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Search Results for ${query}</title>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              padding: 20px;
            }
            .results-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .result {
              background-color: #fff;
              padding: 20px;
              border-radius: 12px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
              margin-bottom: 20px;
            }
            .result h2 {
              margin: 0 0 10px;
              font-size: 20px;
            }
            .result p {
              margin: 0;
              color: #555;
            }
            .result img {
              max-width: 100%;
              border-radius: 12px;
              margin-top: 10px;
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

      // Display the abstract (summary) if available
      if (data.Abstract) {
        resultsHtml += `
          <div class="result">
            <h2>${data.Heading}</h2>
            <p>${data.Abstract}</p>
            ${data.Image ? `<img src="${data.Image}" alt="Image">` : ''}
            <a href="${data.AbstractURL}" target="_blank">Read more on ${data.AbstractSource}</a>
          </div>
        `;
      }

      // Display related topics
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.forEach((topic) => {
          if (topic.Text && topic.FirstURL) {
            resultsHtml += `
              <div class="result">
                <h2>${topic.Text}</h2>
                <a href="/proxy?url=${encodeURIComponent(topic.FirstURL)}" target="_blank">${topic.FirstURL}</a>
              </div>
            `;
          }
        });
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
});

// Proxy route to fetch URLs
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('URL is missing');
  }

  try {
    const response = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);

    // Modify links to go through the proxy
    $('a, link[rel="stylesheet"], script, img').each((i, el) => {
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
