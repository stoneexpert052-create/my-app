
# Stone Expert - Project Documentation

This project is built with Next.js, Tailwind CSS, and Firebase.

## How to Run Locally (Studio Sunset Preparation)

If you need to move this project to your own computer, follow these steps:

1. **Download Code:** Click on the "Download" or "Export" icon in the Firebase Studio sidebar to get a ZIP of all project files.
2. **Install Node.js:** Make sure you have the latest Node.js installed on your computer.
3. **Open Project:** Extract the files and open the folder in **VS Code**.
4. **Install Dependencies:** Open the terminal in VS Code and run:
   ```bash
   npm install
   ```
5. **Run Development Server:** After installation, run:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Important Configs

- **WhatsApp & Contact:** Located in `src/lib/config.json`.
- **Pricing & Costs:** Located in `src/lib/costs.json`.
- **Database:** Now using **Firebase Firestore** for Orders and Searches to prevent file-write errors in production.

---

# سٹون ایکسپرٹ - پروجیکٹ کی معلومات

یہ پروجیکٹ Next.js، Tailwind CSS اور Firebase پر بنایا گیا ہے۔

## کمپیوٹر پر چلانے کا طریقہ (Studio Sunset گائیڈ)

اگر آپ اس پروجیکٹ کو اپنے کمپیوٹر پر منتقل کرنا چاہتے ہیں تو یہ اقدامات کریں:

1. **کوڈ ڈاؤن لوڈ کریں:** فائر بیس اسٹوڈیو میں "Download" کے بٹن پر کلک کریں اور فائلیں حاصل کریں۔
2. **Node.js انسٹال کریں:** اپنے کمپیوٹر پر Node.js کا تازہ ترین ورژن انسٹال کریں۔
3. **پروجیکٹ کھولیں:** فائلوں کو نکالیں (Extract) اور **VS Code** میں فولڈر کھولیں۔
4. **لائبریریز انسٹال کریں:** ٹرمینل میں یہ کمانڈ لکھیں:
   ```bash
   npm install
   ```
5. **ایپ چلائیں:** انسٹالیشن کے بعد یہ کمانڈ لکھیں:
   ```bash
   npm run dev
   ```
   آپ کی ایپ `http://localhost:3000` پر چلنے لگے گی۔

**نوٹ:** میں نے آرڈرز سیو کرنے کے عمل کو **Firestore Database** پر منتقل کر دیا ہے تاکہ پبلشنگ کے بعد کوئی ایرر نہ آئے۔
