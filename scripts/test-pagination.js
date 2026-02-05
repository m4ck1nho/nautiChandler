
const http = require('http');

async function fetchPage(page) {
    return new Promise((resolve, reject) => {
        const url = `http://localhost:3000/api/products/live?q=fitting&page=${page}`;
        console.log(`Fetching Page ${page}...`);

        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const firstProduct = json.products?.[0];
                    resolve(firstProduct);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        const p1 = await fetchPage(1);
        console.log('Page 1 First Product:', p1?.title);

        const p2 = await fetchPage(2);
        console.log('Page 2 First Product:', p2?.title);

        if (!p1 || !p2) {
            console.error('FAILED: Could not fetch products.');
        } else if (p1.id === p2.id) {
            console.error('FAIL: Page 1 and Page 2 have identical first product. Pagination is BROKEN.');
        } else {
            console.log('SUCCESS: Page 2 has different content.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
