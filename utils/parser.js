export const parseReceiptText = (rawText) => {
    if(!rawText) return {title: '', amount: '0.00', category: 'Other'};

    const lines = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 1);
    
    let title = 'Unknown';
    let amount = 0;
    let category = 'Other';

    for (let i = 0; i < Math.min(lines.length, 4); i++) {
        const line = lines[i].toLowerCase();
        const isPhoneNumber = /[\d\-()]{7,}/.test(line);
        const isDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line);
        const isURL = line.includes('www.') || line.includes('.com');
        const isJustNumbers = /^[\d\W_]+$/.test(line);
        const isGSTIN = line.includes('gstin') || line.includes('fssai') || line.includes('cin');

        if(!isPhoneNumber && !isDate && !isURL && !isJustNumbers && !isGSTIN){
            title = lines[i].replace(/[^a-zA-Z0-9 &'-]/g, '').trim();
            break;
        }
    }

    //amount calculation
    let validAmounts = [];

    //eg: 240.00, 12,50
    const decimalMatches = rawText.match(/\b\d+[\.,]\d{2}\b/g);
    if (decimalMatches) {
        validAmounts.push(...decimalMatches.map(n => parseFloat(n.replace(',', '.'))));
    }

    //eg: 10/-, 150 /-, Rs10/-
    const slashDashMatches = rawText.match(/(\d+)\s*\/\-/g);
    if (slashDashMatches) {
        // Strip out the "/-" and any spaces, leaving just the integer
        validAmounts.push(...slashDashMatches.map(n => parseFloat(n.replace(/[^\d]/g, ''))));
    }

    validAmounts = validAmounts.filter(n => !isNaN(n) && n > 0 && n < 500000);
    
    if (validAmounts.length > 0) {
        amount = Math.max(...validAmounts); 
    }
    //amount calculation completed

    //category finding
    const textLower = rawText.toLowerCase();
    const categoryDictionary = {
        'Food': ['restaurant', 'coffee', 'cafe', 'tip', 'dine', 'burger', 'pizza', 'kitchen', 'food', 'bakery', 'grill'],
        'Shopping': ['walmart', 'target', 'market', 'store', 'apparel', 'mall', 'mart', 'supermarket', 'retail', 'boutique'],
        'Transport': ['uber', 'car', 'lyft', 'taxi', 'transit', 'flight', 'station', 'train', 'fuel', 'petrol', 'gas', 'airline'],
        'Bills': ['electric', 'water', 'internet', 'telecom', 'utility', 'broadband', 'mobile'],
        'Groceries': ['grocery', 'groceries', 'vegetable', 'fruit', 'milk', 'bread', 'egg', 'rice', 'flour', 'fresh', 'produce', 'dairy', 'farmer', 'grocery store', 'food bazaar'],
        'Health': ['painkiller', 'hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'medicine', 'drug', 'health', 'healthy', 'lab', 'diagnostic', 'dental', 'dentist', 'care', 'wellness', 'chemist']
    };
    let highScore = 0;

    for (const [cat, keywords] of Object.entries(categoryDictionary)) {
        let score = 0;
        keywords.forEach(kw => {
            if(textLower.includes(kw)) score++;
        });

        if(score > highScore){
            highScore = score;
            category = cat;
        }
    }

    return {
        title: title.length > 1 ? title : 'Unknown',
        amount: isNaN(amount) || amount === 0 ? '' : amount.toFixed(2).toString(),
        category: category
    };
}