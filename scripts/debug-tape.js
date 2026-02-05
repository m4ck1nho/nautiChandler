
const http = require('http');

const term = 'tape';
const url = `http://localhost:3000/api/products/live?q=${term}&page=1`;

console.log(`Testing search for: ${term}`);

http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Product Count:', json.products?.length);
            if (json.products?.length > 0) {
                console.log('First Product:', json.products[0]);
            }
            if (json.debugLogs) {
                console.log('--- SERVER LOGS ---');
                json.debugLogs.forEach(l => console.log(l));
            }
        } catch (e) {
            console.error('Failed to parse JSON:', data.substring(0, 200));
        }
    });
}).on('error', (e) => console.error('Request Error:', e.message));
