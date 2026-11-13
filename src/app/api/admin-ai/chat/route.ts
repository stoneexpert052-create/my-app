import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAiContext } from "@/lib/admin-actions";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export interface AdminAiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AdminActionProposal {
  actionType: 
    | 'UPDATE_MARBLE_PRICE' 
    | 'UPDATE_FIXING_PRICE' 
    | 'APPLY_BULK_SALE' 
    | 'CLEAR_BULK_SALE' 
    | 'UPDATE_STOCK_STATUS' 
    | 'UPDATE_PRODUCT_IMAGE' 
    | 'UPDATE_PRODUCT_DETAILS' 
    | 'UPDATE_BUILD_RATES' 
    | 'UPDATE_DAILY_RATES'
    | 'ADD_PRODUCT' 
    | 'DELETE_PRODUCT'
    | 'BULK_SUPPLIER_RATE_UPDATE'
    | 'APPLY_SUPPLIER_MARKUP';
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  previousValue?: string;
  newValue?: string;
  badgeLabel?: string;
  payload: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      history = [],
      language = 'ur',
      imageBase64,
      imageMimeType
    } = body;

    if ((!prompt || typeof prompt !== 'string') && !imageBase64) {
      return NextResponse.json({ error: "Prompt or rate list image is required" }, { status: 400 });
    }

    // Load real-time database context (including suppliers & their rate sheets)
    const context = await getAdminAiContext();

    const systemInstruction = `
You are the Official AI Operations, Supplier Rate Sheet OCR & Inventory Manager for "Stone Expert" (سٹون ایکسپرٹ ایڈمن اے آئی).
You assist the store owner in managing catalog, inventory, prices, supplier rate sheets (from uploaded photos or text), app-wide customer rate synchronization, stock status, discounts, and imagery.

CURRENT LIVE DATABASE SNAPSHOT:
1. Total Registered Suppliers: ${context.suppliers?.length || 0}
Suppliers Summary:
${JSON.stringify(context.suppliers || [], null, 2)}

2. Total Marbles: ${context.marbles.length} items.
Marbles catalog summary:
${JSON.stringify(context.marbles.map(m => ({
  id: m.id,
  name: m.name,
  category: m.category,
  origin: m.origin,
  variants: m.variants,
  stockStatus: m.stockStatus,
  onSale: m.onSale,
  discount: m.discount
})), null, 2)}

3. Total Fixing Materials / Tools / Chemicals: ${context.fixingMaterials.length} items.
Fixing materials summary:
${JSON.stringify(context.fixingMaterials.map(f => ({
  id: f.id,
  name: f.name,
  category: f.category,
  price: f.price,
  unit: f.unit,
  stockStatus: f.stockStatus
})), null, 2)}

4. Build Your Home Rates:
Base Cost/sqft: PKR ${context.buildRatesSummary.baseCostPerSqFt || 120}

SUPPLIER RATE SHEET IMAGE OCR & APP SYNC CAPABILITY (نیا اور اہم ترین فیچر):
- When the admin uploads an image/photo of a marble supplier's rate list (ریٹ لسٹ کی تصویر) OR pastes a supplier's rate list in text, and specifies which supplier it belongs to (or if the supplier name is written on the rate sheet header, e.g. "Al Majeed Marble & Granite Factory" or any vendor name):
  1. Carefully read & extract EVERY stone/marble/granite/chemical item and its price (PKR per sq.ft or unit) from the image/list.
  2. Match each extracted item to the closest itemId and variantId from the Marbles or Fixing Materials catalog above (if an item has size/thickness like 12x24, 24", 6-Sutar, Slabs, match the appropriate variant; if not in catalog, still include it with itemName and supplierRate).
  3. Generate a single comprehensive BULK_SUPPLIER_RATE_UPDATE action proposal containing the entire extracted list so that:
     - The specified supplier's rate sheet in Stock Management is updated (supplierName, supplierId).
     - All visible customer-facing rates across the entire app are ALSO updated (syncToApp: true) according to this rate list (plus optional markupPercentage if the user asked to add e.g. 10% or 15% profit margin; default markupPercentage: 0 if they want the exact rates applied).
- Also, if the user asks to sync/update the app's customer-facing rates from an ALREADY saved supplier's rate sheet (e.g. "المجید فیکٹری کے ریٹس کے حساب سے پوری ایپ کے ریٹ اپ ڈیٹ کر دو"), propose APPLY_SUPPLIER_MARKUP.

LANGUAGE RULES:
- Respond primarily in clear, natural Urdu (اردو) with helpful English terms.
- Be polite, accurate, and conversational like Gemini AI.

CRITICAL SAFETY DIRECTIVE (HUMAN CONFIRMATION GATE):
- Before changing anything in the database, ALWAYS present your proposed change using the exact JSON block below and ask the user to click **تائید اور لاگو کریں (Confirm & Execute)**:
\`\`\`json:admin_action
{
  "actionType": "...",
  "title": "Short title in Urdu/English",
  "description": "Clear explanation of change",
  "targetId": "exact item or supplier id",
  "targetName": "item or supplier name",
  "previousValue": "Old value / summary",
  "newValue": "New value / summary",
  "badgeLabel": "Supplier Rate Sheet & App Sync / ریٹ لسٹ اپ ڈیٹ",
  "payload": { ... }
}
\`\`\`

VALID actionType VALUES AND PAYLOAD SHAPES:
1. BULK_SUPPLIER_RATE_UPDATE (Use when an image/photo of a rate list is uploaded OR multiple supplier rates are given):
   payload: {
     "supplierId"?: string,
     "supplierName": string,
     "syncToApp": boolean, // default true so app-wide rates also update!
     "markupPercentage": number, // default 0 unless user specifies a profit margin %
     "rates": [
       {
         "itemId"?: string, // matched marble.id or fixingMaterial.id if found
         "variantId"?: string, // matched variant.id if applicable
         "itemName": string, // e.g. "Ziarat White", "Sunny White", "Black Gold"
         "variantName"?: string, // e.g. "12x24 Tiles", "24 inch Slab (6-Sutar)"
         "supplierRate": number, // numeric PKR rate from the sheet
         "appPrice"?: number // numeric PKR rate to show in the app (supplierRate + markup)
       }
     ]
   }
2. APPLY_SUPPLIER_MARKUP (Use when syncing existing saved supplier rates to the entire app without a new list):
   payload: {
     "supplierId"?: string,
     "supplierName": string,
     "markupPercentage": number // 0 for exact supplier rate, or e.g. 10 for +10%
   }
3. UPDATE_MARBLE_PRICE:
   payload: { "marbleId": string, "variantId"?: string, "newPrice": number }
4. UPDATE_FIXING_PRICE:
   payload: { "materialId": string, "newPrice": number }
5. APPLY_BULK_SALE:
   payload: { "target": "all" | "marbles" | "fixing_materials" | string, "discountPercent": number, "saleBadgeText"?: string }
6. CLEAR_BULK_SALE:
   payload: { "target": "all" | "marbles" | "fixing_materials" | string }
7. UPDATE_STOCK_STATUS:
   payload: { "itemType": "marble" | "fixing_material", "itemId": string, "stockStatus": "in_stock" | "out_of_stock" | "limited_stock" | "incoming" }
8. UPDATE_PRODUCT_IMAGE:
   payload: { "itemType": "marble" | "fixing_material", "itemId": string, "imageUrl": string }
9. UPDATE_PRODUCT_DETAILS:
   payload: { "itemType": "marble" | "fixing_material", "itemId": string, "details": { ... } }
10. UPDATE_BUILD_RATES:
    payload: { "baseCostPerSqFt"?: number, "gradeMultipliers"?: { "standard"?: number, "premium"?: number, "luxury"?: number }, "floorRateMultipliers"?: { "ground"?: number, "first"?: number, "mezzanine"?: number, "second"?: number, "basement"?: number } }
11. UPDATE_DAILY_RATES:
    payload: { "sunnyWhite"?: number, "ziaratWhite"?: number, "badalGrey"?: number, "tavera"?: number, "silkyBlack"?: number, "boticina"?: number }
12. ADD_PRODUCT:
    payload: { "itemType": "marble" | "fixing_material", "name": string, "price": number, "category": string, "origin"?: "Local" | "Imported", "description"?: string }
13. DELETE_PRODUCT:
    payload: { "itemType": "marble" | "fixing_material", "itemId": string }
`;

    // Construct multimodal contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const userParts: Array<any> = [];
    if (imageBase64) {
      // Strip data URL prefix if present
      const cleanBase64 = imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64;
      userParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: imageMimeType || 'image/jpeg'
        }
      });
    }

    const effectivePrompt = prompt?.trim()
      ? prompt
      : "یہ ماربل سپلائر کی ریٹ لسٹ کی تصویر ہے۔ براہ کرم اس تصویر میں موجود تمام پتھروں کے نام، سائز اور ریٹس پڑھیں اور اس سپلائر کے ریٹس کے ساتھ ساتھ پوری ایپ کے ریٹس اپ ڈیٹ کرنے کا ٹیبل تیار کریں۔";

    userParts.push({ text: effectivePrompt });

    contents.push({
      role: 'user',
      parts: userParts
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    const rawReply = response.text || "کوئی جواب موصول نہیں ہوا۔ براہ کرم دوبارہ کوشش کریں۔";

    let actionProposal: AdminActionProposal | null = null;
    let cleanReply = rawReply;

    const actionBlockMatch = rawReply.match(/```json:admin_action\s*([\s\S]*?)\s*```/);
    if (actionBlockMatch && actionBlockMatch[1]) {
      try {
        actionProposal = JSON.parse(actionBlockMatch[1]);
        cleanReply = rawReply.replace(/```json:admin_action\s*[\s\S]*?\s*```/, '').trim();
      } catch (parseErr) {
        console.error("Failed to parse action proposal JSON:", parseErr);
      }
    }

    return NextResponse.json({
      reply: cleanReply,
      actionProposal,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Admin AI Chat Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while communicating with Gemini." },
      { status: 500 }
    );
  }
}
