const axios = require('axios');

module.exports = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing search query' });

    try {
        const response = await axios.get('https://api.duckduckgo.com/', {
            params: { q, format: 'json', no_html: 1, no_redirect: 1, skip_disambig: 1 }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
};
