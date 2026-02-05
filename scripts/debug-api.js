
const http = require('http');

// Search URL (Testing 'fitting' category pagination)
const url = 'http://localhost:3000/api/products/live?q=fitting&page=2';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Body:', data);
    });
}).on('error', (err) => {
    console.error('Error:', err);
});
