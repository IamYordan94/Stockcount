const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const filePath = 'C:\\Users\\veria\\Desktop\\Stock take October.xlsx';

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log('Reading Excel file...');
const workbook = XLSX.readFile(filePath);

console.log('\n=== Excel File Structure ===');
console.log('Total sheets:', workbook.SheetNames.length);
console.log('Sheet names:', workbook.SheetNames.join(', '));

// Analyze first few sheets to understand structure
const sampleSheets = workbook.SheetNames.slice(0, 3);
console.log('\n=== Sample Sheet Analysis ===');

sampleSheets.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, // Use array format to see raw structure
    defval: '',
    raw: false
  });
  
  console.log(`\n--- ${sheetName} ---`);
  console.log('Total rows:', jsonData.length);
  console.log('First 10 rows:');
  jsonData.slice(0, 10).forEach((row, i) => {
    console.log(`  Row ${i + 1}:`, row);
  });
});

// Now parse with proper headers
console.log('\n=== Parsing with Headers ===');
const allShops = [];
const allItems = new Map(); // item name -> { item data, shops it appears in }
const shopStock = [];

workbook.SheetNames.forEach((sheetName) => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: ['productinformatie', 'verpakkingsEenheid', 'aantal', 'losseStuks'],
    defval: '',
    raw: false
  });

  const shop = {
    name: sheetName,
    items: []
  };

  let currentCategory = 'Uncategorized';
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    if (!row || !row.productinformatie) continue;

    const productInfo = String(row.productinformatie || '').trim();
    
    // Check if this is a category header
    if (productInfo && 
        (productInfo === productInfo.toUpperCase() || 
         ['IJSJES', 'DRANK', 'ETEN', 'Stromma branded', 'Cheese', 'KAAS'].includes(productInfo) ||
         productInfo.match(/^[A-Z\s]+$/))) {
      currentCategory = productInfo;
      continue;
    }

    if (!productInfo) continue;

    const verpakkingsEenheid = String(row.verpakkingsEenheid || '').trim();
    
    let aantal = 0;
    let losseStuks = 0;

    try {
      const aantalStr = String(row.aantal || '').trim();
      aantal = aantalStr === '' ? 0 : parseInt(aantalStr, 10) || 0;
    } catch (e) {
      // Ignore
    }

    try {
      const losseStuksStr = String(row.losseStuks || '').trim();
      losseStuks = losseStuksStr === '' ? 0 : parseInt(losseStuksStr, 10) || 0;
    } catch (e) {
      // Ignore
    }

    const itemKey = `${productInfo}|${verpakkingsEenheid}`;
    
    // Store item globally
    if (!allItems.has(itemKey)) {
      allItems.set(itemKey, {
        name: productInfo,
        packaging_unit_description: verpakkingsEenheid,
        category: currentCategory,
        shops: []
      });
    }
    
    allItems.get(itemKey).shops.push(sheetName);

    shop.items.push({
      name: productInfo,
      packaging_unit_description: verpakkingsEenheid,
      category: currentCategory,
      aantal,
      losseStuks
    });
  }

  allShops.push(shop);
});

console.log('\n=== Summary ===');
console.log('Total shops:', allShops.length);
console.log('Total unique items:', allItems.size);
console.log('\nShop names:');
allShops.forEach(shop => {
  console.log(`  - ${shop.name} (${shop.items.length} items)`);
});

// Save analysis to file
const analysis = {
  shops: allShops.map(s => ({ name: s.name, itemCount: s.items.length })),
  uniqueItems: Array.from(allItems.values()).map(i => ({
    name: i.name,
    packaging: i.packaging_unit_description,
    category: i.category,
    appearsInShops: i.shops.length
  }))
};

fs.writeFileSync(
  path.join(__dirname, 'excel-analysis.json'),
  JSON.stringify(analysis, null, 2)
);

console.log('\nAnalysis saved to scripts/excel-analysis.json');
