
const http = require('http');

const url = 'http://localhost:3000/api/products/live?category=fitting&page=2';

console.log('Testing:', url);

http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Products:', json.products?.length);
            console.log('HasMore:', json.hasMore);
            if (json.products?.[0]) console.log('First:', json.products[0].title);
            if (json.debugLogs) {
                console.log('--- LOGS ---');
                json.debugLogs.forEach(l => console.log(l));
            }
        } catch (e) {
            console.error('Parse error:', data.substring(0, 200));
        }
    });
}).on('error', (e) => console.error('Request Error:', e.message));
