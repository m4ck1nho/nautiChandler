
const urls = [
    // Original format (broken)
    'https://nautichandler.com/en/search?controller=search&s=tape',
    // Alternative format 1: without controller param
    'https://nautichandler.com/en/search?s=tape',
    // Alternative format 2: POST-style query (some PrestaShop setups)
    'https://nautichandler.com/en/module/leoproductsearch/productsearch?s=tape&ajax=1',
    // Alternative format 3: simpler search path
    'https://nautichandler.com/en/search?q=tape',
    // Known working category
    'https://nautichandler.com/en/100396-fitting'
];

async function test() {
    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://nautichandler.com/en/'
                }
            });
            console.log(`Status: ${res.status}`);
            const text = await res.text();
            console.log(`Length: ${text.length}`);
            if (text.includes('tape')) console.log('Found "tape" in response!');
        } catch (e) {
            console.error(`Failed: ${e.message}`);
        }
        console.log('---');
    }
}

test();
