/**
 * Utility to parse transaction messages (SMS/alerts) and extract structured expense data.
 */

// Keyword mapping for automatic category inference
const CATEGORY_KEYWORDS = {
  Food: ["swiggy", "zomato", "starbucks", "mcdonalds", "domino", "pizza", "restaurant", "cafe", "eats", "food", "dine", "kitchen", "bakery", "deli", "grocery", "groceries", "supermarket", "instamart", "blinkit", "zepto"],
  Transport: ["uber", "ola", "metro", "fuel", "petrol", "shell", "hpcl", "bpcl", "cabs", "taxi", "irctc", "railway", "train", "bus", "auto", "toll", "fastag"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "zara", "h&m", "retail", "store", "mall", "shopping", "clothes", "shoes", "boutique", "superkalam"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "hotstar", "prime video", "steam", "playstation", "nintendo", "theatre", "cinema", "club", "pub", "bar", "liquor"],
  Utilities: ["electricity", "water", "rent", "recharge", "airtel", "jio", "vi", "broadband", "wifi", "gas", "maintenance", "insurance"],
  Health: ["pharmacy", "chemist", "hospital", "doctor", "clinic", "lab", "apollo", "medplus", "dental", "gym", "fitness", "workout"],
  Subscriptions: ["youtube premium", "medium", "openai", "chatgpt", "github", "icloud", "google one", "adobe", "canva", "subscription"],
  Travel: ["makemytrip", "easemytrip", "goibibo", "airbnb", "hotel", "stay", "flight", "booking", "trip", "travel"],
  Gifts: ["gift", "giftcard", "shagun", "voucher", "present"],
  Investments: ["zerodha", "groww", "mutual fund", "sip", "stocks", "etf", "invest", "coindcx", "wazirx"],
  "Business Payments": ["vendor", "client", "business", "payroll", "invoice", "freelance", "hosting", "aws", "gcp"]
};

// Map categories to default necessities
const NECESSITY_MAP = {
  Food: "Need",
  Transport: "Need",
  Shopping: "Want",
  Entertainment: "Want",
  Utilities: "Need",
  Health: "Need",
  Subscriptions: "Want",
  Travel: "Want",
  Gifts: "Want",
  Investments: "Need", // Or could be classified separately, but let's default to Need for wealth building
  "Business Payments": "Need"
};

/**
 * Infer category based on merchant name
 */
export function inferCategory(merchantName) {
  if (!merchantName) return "Other";
  
  const cleanName = merchantName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => cleanName.includes(keyword))) {
      return category;
    }
  }
  
  return "Other";
}

/**
 * Parses raw text messages to extract transaction details.
 * Supports various formats from Indian banks and payment systems (UPI, Debit, Credit Cards, Spent).
 * 
 * @param {string} text - The raw SMS message.
 * @returns {object|null} - An expense payload or null if parsing fails.
 */
export function parseSMSExpense(text) {
  if (!text || typeof text !== "string") return null;

  const normalizedText = text.replace(/\s+/g, " ");

  // 1. Try to extract the Amount
  // Matches formats like: Rs. 150, Rs.150.00, INR 1,500, Rs 750, etc.
  const amountRegex = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = normalizedText.match(amountRegex);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  if (isNaN(amount) || amount <= 0) return null;

  // 2. Try to find the Merchant/Vendor
  let vendor = "";

  // Pattern A: "sent Rs.100 to VENDOR on date" or "paid Rs.100 to VENDOR"
  // E.g. "Sent Rs.150 to Swiggy on 13-Jun-26"
  const sentToPattern = /(?:sent|paid|transferred|debited)\s+(?:Rs\.?|INR|₹)\s*[\d,.]+\s+to\s+([A-Za-z0-9\s&._#-]+?)(?:\s+on|\s+ref|\s+upi|\s+from|\s+a\/c|\.$)/i;
  
  // Pattern B: "debited from A/c XX: Rs.100 on date at VENDOR"
  // E.g. "Debited from A/c XX1234: Rs 500.00 on 13-Jun-26 at Zomato"
  const debitedAtPattern = /(?:debited|spent|txn of)\s+(?:from\s+A\/c\s+[a-zA-Z0-9*]+\s*:\s*)?(?:Rs\.?|INR|₹)\s*[\d,.]+\s+(?:on\s+[^a-zA-Z]+)?(?:at|info:)\s*([A-Za-z0-9\s&._#-]+?)(?:\s+ref|\s+upi|\s+from|\s+a\/c|\.$)/i;

  // Pattern C: "Txn of INR 500 at VENDOR on date"
  const txnAtPattern = /(?:txn|transaction)\s+of\s+(?:Rs\.?|INR|₹)\s*[\d,.]+\s+(?:at|to)\s+([A-Za-z0-9\s&._#-]+?)(?:\s+on|\s+ref|\s+upi|\.|$)/i;

  // Pattern D: Simple spend "Spent Rs 250 at VENDOR" or "Spent Rs 250 on VENDOR"
  const spentAtPattern = /spent\s+(?:Rs\.?|INR|₹)\s*[\d,.]+\s+(?:at|on|to)\s+([A-Za-z0-9\s&._#-]+)/i;

  const matchA = normalizedText.match(sentToPattern);
  const matchB = normalizedText.match(debitedAtPattern);
  const matchC = normalizedText.match(txnAtPattern);
  const matchD = normalizedText.match(spentAtPattern);

  if (matchA) {
    vendor = matchA[1].trim();
  } else if (matchB) {
    vendor = matchB[1].trim();
  } else if (matchC) {
    vendor = matchC[1].trim();
  } else if (matchD) {
    vendor = matchD[1].trim();
  }

  // Clean vendor name: remove common trailing noise like "ref", "upi ref", date snippets
  if (vendor) {
    vendor = vendor
      .replace(/\b(ref|upi|txn|using|from|acct|balance|avail|avl)\b.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // If vendor is still blank, default to "Unknown Merchant"
  if (!vendor) {
    vendor = "Unknown Merchant";
  }

  const category = inferCategory(vendor);
  const necessity = NECESSITY_MAP[category] || "Need";

  return {
    amount,
    category,
    description: vendor !== "Unknown Merchant" ? `Parsed from SMS: ${vendor}` : "Parsed transaction alert",
    necessity,
    type: "Personal" // Default to Personal, can be adjusted in the UI
  };
}
