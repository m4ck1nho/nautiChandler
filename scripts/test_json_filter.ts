
import fs from 'fs';
import path from 'path';

// Replicate the Target Categories from route.ts
const TARGET_CATEGORIES = [
    { name: 'electronics', url: '/en/190-electronics' },
    { name: 'motor', url: '/en/100393-motor' },
    { name: 'ropes', url: '/en/100395-ropes' },
    { name: 'rope', url: '/en/100395-ropes' },
    { name: 'safety', url: '/en/100389-safety' },
    { name: 'anchors', url: '/en/100810-anchors' },
    { name: 'anchor', url: '/en/100810-anchors' },
    { name: 'anchoring', url: '/en/100810-anchors' },
    { name: 'fitting', url: '/en/100396-fitting' },
    { name: 'fittings', url: '/en/100396-fitting' },
    { name: 'plumbing', url: '/en/100713-plumbing' },
    { name: 'painting', url: '/en/100390-painting' },
    { name: 'paint', url: '/en/100390-painting' },
    { name: 'screws', url: '/en/100394-screws' },
    { name: 'tools', url: '/en/100391-tools-machines' },
    { name: 'electrics', url: '/en/100392-electricslighting' },
    { name: 'maintenance', url: '/en/100669-maintenance-cleaning-products' },
    { name: 'navigation', url: '/en/100329-navigation' },
    { name: 'clothing', url: '/en/43-personal-equipment' },
    { name: 'life-on-board', url: '/en/197-life-on-board' },
    { name: 'inflatables', url: '/en/100911-inflatablewater-toys' }
];

async function main() {
    const jsonPath = path.join(process.cwd(), 'public', 'products.json');
    console.log(`Reading: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
        console.error('File not found!');
        return;
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const localProducts = JSON.parse(fileContent);
    console.log(`Loaded ${localProducts.length} items from JSON.`);

    // Test cases that mimic failing requests
    const testCases = [
        'fitting',
        'FITTING',
        'ANCHORING & DOCKING',
        'ropes',
        'electronics'
    ];

    testCases.forEach(categoryId => {
        console.log(`\n--- Testing Category: "${categoryId}" ---`);

        let targetCat = categoryId.toLowerCase();

        // Logic from route.ts
        if (targetCat.match(/^\d+-/)) {
            targetCat = targetCat.replace(/^\d+-/, '');
        }

        // Bidirectional check
        const mapped = TARGET_CATEGORIES.find(c => targetCat.includes(c.name) || c.name.includes(targetCat));

        if (mapped) {
            console.log(`  Mapped "${categoryId}" -> "${mapped.name}"`);
            targetCat = mapped.name;
        } else {
            console.log(`  No mapping found for "${categoryId}"`);
        }

        const matches = localProducts.filter((p: any) => {
            const pCat = (p.category || '').toLowerCase();
            // Check precise match first, then partial
            return pCat === targetCat || pCat.includes(targetCat) || targetCat.includes(pCat);
        });

        console.log(`  Found ${matches.length} matches.`);
        if (matches.length > 0) {
            console.log(`  First match category: "${matches[0].category}"`);
        }
    });

}

main().catch(console.error);
