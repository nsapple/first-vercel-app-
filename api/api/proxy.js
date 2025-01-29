const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Missing URL' });

    try {
        const response = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);

        $('a, link[rel="stylesheet"], script, img').each((i, el) => {
            const element = $(el);
            const attr = element.is('img') ? 'src' : 'href';
            const resourceUrl = element.attr(attr);
            if (resourceUrl && !resourceUrl.startsWith('http')) {
                element.attr(attr, new URL(resourceUrl, targetUrl).toString());
            }
        });

        res.send($.html());
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch URL' });
    }
};
