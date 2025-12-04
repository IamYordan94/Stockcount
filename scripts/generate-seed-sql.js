const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Read the Excel file
const filePath = 'C:\\Users\\veria\\Desktop\\Stock take October.xlsx';
const workbook = XLSX.readFile(filePath);

// Helper to generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Determine main category based on shop category
function getMainCategory(category) {
  const cat = String(category || '').toUpperCase();
  if (cat.includes('CATERING')) {
    return 'catering';
  }
  return 'floor'; // Default to floor for shop items
}

// Parse all shops and items
const shops = [];
const itemsMap = new Map(); // key: "name|packaging" -> item data
const shopStockMap = new Map(); // key: "shopName|itemKey" -> stock data

// First pass: collect all shops and items
workbook.SheetNames.forEach((sheetName) => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: ['productinformatie', 'verpakkingsEenheid', 'aantal', 'losseStuks'],
    defval: '',
    raw: false
  });

  let currentCategory = 'Uncategorized';
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    if (!row || !row.productinformatie) continue;

    const productInfo = String(row.productinformatie || '').trim();
    
    // Check if this is a category header
    if (productInfo && 
        (productInfo === productInfo.toUpperCase() || 
         ['IJSJES', 'DRANK', 'ETEN', 'Stromma branded', 'Cheese', 'KAAS', 'DRANK SHOP', 'DRANK CATERING'].includes(productInfo) ||
         productInfo.match(/^[A-Z\s]+$/))) {
      currentCategory = productInfo;
      continue;
    }

    if (!productInfo || productInfo === 'Productinformatie') continue;

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
    if (!itemsMap.has(itemKey)) {
      const mainCategory = getMainCategory(currentCategory);
      itemsMap.set(itemKey, {
        name: productInfo,
        packaging_unit_description: verpakkingsEenheid,
        category: currentCategory,
        main_category: mainCategory
      });
    }
    
    // Store shop stock
    const stockKey = `${sheetName}|${itemKey}`;
    shopStockMap.set(stockKey, {
      shopName: sheetName,
      itemKey: itemKey,
      category: currentCategory,
      packaging_units: aantal,
      loose_pieces: losseStuks
    });
  }

  shops.push(sheetName);
});

// Find template shop for empty shops (use shop with most items)
let templateShop = null;
let maxItems = 0;
const shopItemCounts = new Map();

workbook.SheetNames.forEach((sheetName) => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: ['productinformatie', 'verpakkingsEenheid', 'aantal', 'losseStuks'],
    defval: '',
    raw: false
  });
  
  let itemCount = 0;
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row && row.productinformatie) {
      const productInfo = String(row.productinformatie || '').trim();
      if (productInfo && productInfo !== productInfo.toUpperCase() && productInfo !== 'Productinformatie') {
        itemCount++;
      }
    }
  }
  
  shopItemCounts.set(sheetName, itemCount);
  if (itemCount > maxItems) {
    maxItems = itemCount;
    templateShop = sheetName;
  }
});

console.log(`Template shop for empty shops: ${templateShop} (${maxItems} items)`);

// For empty shops, copy items from template shop with 0 quantities
const emptyShops = ['Damrak 4', 'VC'];
emptyShops.forEach(emptyShop => {
  if (templateShop) {
    const worksheet = workbook.Sheets[templateShop];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: ['productinformatie', 'verpakkingsEenheid', 'aantal', 'losseStuks'],
      defval: '',
      raw: false
    });

    let currentCategory = 'Uncategorized';
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || !row.productinformatie) continue;

      const productInfo = String(row.productinformatie || '').trim();
      
      if (productInfo && 
          (productInfo === productInfo.toUpperCase() || 
           ['IJSJES', 'DRANK', 'ETEN', 'Stromma branded', 'Cheese', 'KAAS', 'DRANK SHOP', 'DRANK CATERING'].includes(productInfo) ||
           productInfo.match(/^[A-Z\s]+$/))) {
        currentCategory = productInfo;
        continue;
      }

      if (!productInfo || productInfo === 'Productinformatie') continue;

      const verpakkingsEenheid = String(row.verpakkingsEenheid || '').trim();
      const itemKey = `${productInfo}|${verpakkingsEenheid}`;
      
      // Add stock entry with 0 quantities
      const stockKey = `${emptyShop}|${itemKey}`;
      shopStockMap.set(stockKey, {
        shopName: emptyShop,
        itemKey: itemKey,
        category: currentCategory,
        packaging_units: 0,
        loose_pieces: 0
      });
    }
  }
});

// Generate SQL
const sqlLines = [];
sqlLines.push('-- Seed data generated from Excel file: Stock take October.xlsx');
sqlLines.push('-- Generated on: ' + new Date().toISOString());
sqlLines.push('');
sqlLines.push('-- Insert Shops');
sqlLines.push('');

const shopIds = new Map();
shops.forEach(shopName => {
  const shopId = generateUUID();
  shopIds.set(shopName, shopId);
  sqlLines.push(`INSERT INTO shops (id, name, created_at) VALUES ('${shopId}', '${shopName.replace(/'/g, "''")}', NOW()) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;`);
});

sqlLines.push('');
sqlLines.push('-- Insert Items');
sqlLines.push('');

const itemIds = new Map();
let itemIndex = 0;
itemsMap.forEach((item, itemKey) => {
  const itemId = generateUUID();
  itemIds.set(itemKey, itemId);
  const name = item.name.replace(/'/g, "''");
  const packaging = (item.packaging_unit_description || '').replace(/'/g, "''");
  const category = (item.category || 'Uncategorized').replace(/'/g, "''");
  const mainCategory = item.main_category || 'floor';
  
  // Note: items table doesn't have unique constraint, so we can't use ON CONFLICT
  // If re-running, clear items first or manually handle duplicates
  sqlLines.push(`INSERT INTO items (id, name, category, packaging_unit_description, main_category, created_at) VALUES ('${itemId}', '${name}', '${category}', '${packaging}', '${mainCategory}', NOW());`);
  itemIndex++;
});

sqlLines.push('');
sqlLines.push('-- Insert Shop Stock');
sqlLines.push('');

shopStockMap.forEach((stock, stockKey) => {
  const shopId = shopIds.get(stock.shopName);
  const itemId = itemIds.get(stock.itemKey);
  
  if (shopId && itemId) {
    const stockId = generateUUID();
    sqlLines.push(`INSERT INTO shop_stock (id, shop_id, item_id, packaging_units, loose_pieces, created_at, updated_at) VALUES ('${stockId}', '${shopId}', '${itemId}', ${stock.packaging_units}, ${stock.loose_pieces}, NOW(), NOW()) ON CONFLICT (shop_id, item_id) DO UPDATE SET packaging_units = EXCLUDED.packaging_units, loose_pieces = EXCLUDED.loose_pieces, updated_at = NOW();`);
  }
});

// Write SQL file
const outputPath = path.join(__dirname, '..', 'supabase', 'seeds', '001_initial_shops_and_items.sql');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, sqlLines.join('\n'));

console.log(`\n✅ SQL seed file generated: ${outputPath}`);
console.log(`   - ${shops.length} shops`);
console.log(`   - ${itemsMap.size} unique items`);
console.log(`   - ${shopStockMap.size} shop stock entries`);

