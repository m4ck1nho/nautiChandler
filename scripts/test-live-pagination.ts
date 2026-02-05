
import axios from 'axios';

async function testPagination() {
    try {
        console.log('Fetching Page 1...');
        const res1 = await axios.get('http://localhost:3000/api/products/live?q=anchor&page=1');
        const products1 = res1.data.products;
        console.log(`Page 1: ${products1.length} products`);
        if (products1.length > 0) {
            console.log(`First item: ${products1[0].title} (${products1[0].id})`);
        }

        console.log('\nFetching Page 2...');
        const res2 = await axios.get('http://localhost:3000/api/products/live?q=anchor&page=2');
        const products2 = res2.data.products;
        console.log(`Page 2: ${products2.length} products`);
        if (products2.length > 0) {
            console.log(`First item: ${products2[0].title} (${products2[0].id})`);
            console.log(`Image: ${products2[0].image}`);
        }

        // Compare
        if (products1.length > 0 && products2.length > 0) {
            if (products1[0].id === products2[0].id) {
                console.error('\nFAIL: Page 1 and Page 2 return the SAME content. Pagination is ignored by source site.');
            } else {
                console.log('\nSUCCESS: Page 2 content is different.');
            }
        }

    } catch (err) {
        console.error('Error:', (err as Error).message);
    }
}

testPagination();
