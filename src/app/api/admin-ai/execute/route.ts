import { NextRequest, NextResponse } from "next/server";
import { 
  getMarbles, 
  updateMarbleDetails, 
  updateFixingMaterialFields, 
  applyBulkSaleDiscount, 
  clearBulkSaleDiscount,
  getBuildYourHomeRatesConfig,
  updateBuildYourHomeRates,
  saveDailyRates,
  deleteMarble,
  deleteFixingMaterial,
  ensureCategoryExists,
  updateSupplierRateListAndSyncApp,
  syncSupplierRatesToEntireApp,
  getDb
} from "@/lib/admin-actions";
import { collection, doc, setDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionType, targetId, targetName, payload, confirmed } = body;

    if (!confirmed) {
      return NextResponse.json(
        { error: "Action requires explicit user confirmation." },
        { status: 400 }
      );
    }

    if (!actionType) {
      return NextResponse.json(
        { error: "actionType is required." },
        { status: 400 }
      );
    }

    let successMessageUr = "";
    let successMessageEn = "";

    switch (actionType) {
      case "UPDATE_MARBLE_PRICE": {
        const id = payload?.marbleId || targetId;
        const newPrice = Number(payload?.newPrice);
        if (!id || isNaN(newPrice)) {
          return NextResponse.json({ error: "Invalid marble ID or price" }, { status: 400 });
        }

        const marbles = await getMarbles();
        const targetMarble = marbles.find(m => m.id === id);
        if (!targetMarble) {
          return NextResponse.json({ error: "Marble item not found" }, { status: 404 });
        }

        const variantId = payload?.variantId;
        const updatedVariants = targetMarble.variants.map(v => {
          if (!variantId || v.id === variantId) {
            return { ...v, price: newPrice };
          }
          return v;
        });

        // If no variants exist, provide a default variant
        if (updatedVariants.length === 0) {
          updatedVariants.push({
            id: `v_${Date.now()}`,
            size: 'Standard Slab / ٹائل',
            price: newPrice,
            thickness: '16mm'
          });
        }

        const res = await updateMarbleDetails(id, { variants: updatedVariants });
        if (!res.success) {
          throw new Error((res as any).error || "Failed to update marble price");
        }

        successMessageUr = `ماربل "${targetName || targetMarble.name}" کا ریٹ کامیابی سے PKR ${newPrice.toLocaleString()} فی مربع فٹ اپڈیٹ کر دیا گیا۔`;
        successMessageEn = `Rate for "${targetName || targetMarble.name}" successfully updated to PKR ${newPrice.toLocaleString()} / sq.ft.`;
        break;
      }

      case "UPDATE_FIXING_PRICE": {
        const id = payload?.materialId || targetId;
        const newPrice = Number(payload?.newPrice);
        if (!id || isNaN(newPrice)) {
          return NextResponse.json({ error: "Invalid fixing material ID or price" }, { status: 400 });
        }

        const res = await updateFixingMaterialFields(id, { price: newPrice });
        if (!res.success) {
          throw new Error((res as any).error || "Failed to update fixing material price");
        }

        successMessageUr = `پروڈکٹ "${targetName || id}" کا ریٹ کامیابی سے PKR ${newPrice.toLocaleString()} سیو کر دیا گیا۔`;
        successMessageEn = `Price for "${targetName || id}" updated to PKR ${newPrice.toLocaleString()}.`;
        break;
      }

      case "APPLY_BULK_SALE": {
        const target = payload?.target || "all";
        const discountPercent = Number(payload?.discountPercent);
        const saleBadgeText = payload?.saleBadgeText || `SALE ${discountPercent}% OFF`;

        if (isNaN(discountPercent) || discountPercent < 1 || discountPercent > 99) {
          return NextResponse.json({ error: "Invalid discount percentage (1-99)" }, { status: 400 });
        }

        const res = await applyBulkSaleDiscount({
          target,
          discountPercent,
          saleBadgeText
        });

        if (!res.success) {
          throw new Error((res as any).error || "Failed to apply bulk discount");
        }

        const count = (res as any).updatedCount || "تمام";
        successMessageUr = `${count} آئٹمز پر ${discountPercent} فیصد بلک ڈسکاؤنٹ لاگو ہو گیا ہے۔`;
        successMessageEn = `Successfully applied ${discountPercent}% discount across ${count} items.`;
        break;
      }

      case "CLEAR_BULK_SALE": {
        const target = payload?.target || "all";
        const res = await clearBulkSaleDiscount({ target });
        if (!res.success) {
          throw new Error((res as any).error || "Failed to clear discount");
        }

        const count = (res as any).clearedCount || "منتخب";
        successMessageUr = `${count} آئٹمز سے ڈسکاؤنٹ کامیابی سے ہٹا دیا گیا۔`;
        successMessageEn = `Discount successfully cleared from ${count} items.`;
        break;
      }

      case "UPDATE_STOCK_STATUS": {
        const itemType = payload?.itemType || "marble";
        const id = payload?.itemId || targetId;
        const stockStatus = payload?.stockStatus || "in_stock";
        const isLegacyInStock = stockStatus === 'in_stock' || stockStatus === 'limited_stock' || stockStatus === 'incoming';

        if (!id) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        if (itemType === "marble") {
          await updateMarbleDetails(id, { stockStatus, inStock: isLegacyInStock });
        } else {
          await updateFixingMaterialFields(id, { stockStatus, inStock: isLegacyInStock });
        }

        const statusUrdu = stockStatus === 'in_stock' ? 'دستیاب (In Stock)' : stockStatus === 'out_of_stock' ? 'ختم شدہ (Out of Stock)' : 'محدود اسٹاک (Limited Stock)';
        successMessageUr = `"${targetName || id}" کا اسٹاک اسٹیٹس کامیابی سے "${statusUrdu}" کر دیا گیا۔`;
        successMessageEn = `Stock status for "${targetName || id}" updated to ${stockStatus}.`;
        break;
      }

      case "UPDATE_PRODUCT_IMAGE": {
        const itemType = payload?.itemType || "marble";
        const id = payload?.itemId || targetId;
        const imageUrl = payload?.imageUrl;

        if (!id || !imageUrl) {
          return NextResponse.json({ error: "Item ID and Image URL are required" }, { status: 400 });
        }

        if (itemType === "marble") {
          await updateMarbleDetails(id, { imageUrl });
        } else {
          await updateFixingMaterialFields(id, { imageUrl });
        }

        successMessageUr = `"${targetName || id}" کی تصویر کامیابی سے تبدیل کر دی گئی۔`;
        successMessageEn = `Image for "${targetName || id}" successfully updated.`;
        break;
      }

      case "UPDATE_PRODUCT_DETAILS": {
        const itemType = payload?.itemType || "marble";
        const id = payload?.itemId || targetId;
        const details = payload?.details || {};

        if (!id) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        if (itemType === "marble") {
          await updateMarbleDetails(id, details);
        } else {
          await updateFixingMaterialFields(id, details);
        }

        successMessageUr = `"${targetName || id}" کی معلومات کامیابی سے سیو ہو گئیں۔`;
        successMessageEn = `Product details for "${targetName || id}" successfully updated.`;
        break;
      }

      case "UPDATE_BUILD_RATES": {
        const current = await getBuildYourHomeRatesConfig();
        const updatedNewProjects = {
          ...current.newProjects,
          baseCostPerSqFt: payload?.baseCostPerSqFt ?? current.newProjects.baseCostPerSqFt,
          gradeMultipliers: {
            ...current.newProjects.gradeMultipliers,
            ...payload?.gradeMultipliers
          },
          floorRateMultipliers: {
            ...current.newProjects.floorRateMultipliers,
            ...payload?.floorRateMultipliers
          }
        };

        const res = await updateBuildYourHomeRates({
          ...current,
          newProjects: updatedNewProjects
        });

        if (!res.success) {
          throw new Error((res as any).error || "Failed to update build rates");
        }

        successMessageUr = "بلڈ یور ہوم (تعمیراتی لاگت) کے ریٹس کامیابی سے اپڈیٹ ہو گئے۔";
        successMessageEn = "Build Your Home construction rates successfully updated.";
        break;
      }

      case "UPDATE_DAILY_RATES": {
        const res = await saveDailyRates(payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to update daily rates");
        }

        successMessageUr = "ماربل مارکیٹ کے یومیہ ریٹس کامیابی سے سیو ہو گئے۔";
        successMessageEn = "Daily market rates successfully updated.";
        break;
      }

      case "ADD_PRODUCT": {
        const itemType = payload?.itemType || "marble";
        const name = payload?.name;
        const price = Number(payload?.price) || 100;
        const category = payload?.category || (itemType === 'marble' ? 'Marble' : 'Tool');

        if (!name) {
          return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        await ensureCategoryExists(category);

        const db = getDb();
        if (!db) {
          throw new Error("Database not connected");
        }

        const newId = `${itemType}_${Date.now()}`;
        if (itemType === 'marble') {
          const newDoc = {
            id: newId,
            name,
            materialType: category,
            category,
            origin: payload?.origin || 'Local',
            description: payload?.description || `${name} premium quality stone from Stone Expert.`,
            imageUrl: payload?.imageUrl || `https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80`,
            imageHint: name,
            uses: 'Flooring, Stairs, Kitchen Countertop, Vanity',
            characteristics: 'High polish, durable, natural patterns',
            variants: [{
              id: `var_${Date.now()}`,
              size: 'Standard Slab / سلیب',
              price,
              thickness: '16mm'
            }],
            gallery: [],
            isFeatured: false,
            stockStatus: 'in_stock',
            inStock: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'marbles', newId), newDoc);
        } else {
          const newDoc = {
            id: newId,
            name,
            category,
            price,
            unit: payload?.unit || 'Piece',
            description: payload?.description || `${name} for marble installation and maintenance.`,
            imageUrl: payload?.imageUrl || `https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80`,
            stockStatus: 'in_stock',
            inStock: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'fixing_materials', newId), newDoc);
        }

        successMessageUr = `نیا پروڈکٹ "${name}" (ریٹ: PKR ${price}) کامیابی سے سسٹم میں شامل ہو گیا۔`;
        successMessageEn = `New product "${name}" (PKR ${price}) successfully added to database.`;
        break;
      }

      case "DELETE_PRODUCT": {
        const itemType = payload?.itemType || "marble";
        const id = payload?.itemId || targetId;
        if (!id) {
          return NextResponse.json({ error: "Item ID required for deletion" }, { status: 400 });
        }

        if (itemType === "marble") {
          await deleteMarble(id);
        } else {
          await deleteFixingMaterial(id);
        }

        successMessageUr = `پروڈکٹ "${targetName || id}" کامیابی سے ڈیلیٹ کر دیا گیا۔`;
        successMessageEn = `Product "${targetName || id}" deleted successfully.`;
        break;
      }

      case "BULK_SUPPLIER_RATE_UPDATE": {
        const supplierName = payload?.supplierName || targetName || "Marble Supplier";
        const supplierId = payload?.supplierId || targetId;
        const syncToApp = payload?.syncToApp !== false;
        const markupPercentage = Number(payload?.markupPercentage) || 0;
        const rates = Array.isArray(payload?.rates) ? payload.rates : [];

        if (rates.length === 0) {
          return NextResponse.json({ error: "No rate items provided in payload" }, { status: 400 });
        }

        const res = await updateSupplierRateListAndSyncApp({
          supplierId,
          supplierName,
          syncToApp,
          markupPercentage,
          rates
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to update supplier rate list");
        }

        successMessageUr = `سپلائر "${res.supplierName}" کے ${res.updatedSupplierRatesCount} ریٹس اسٹاک مینجمنٹ میں اپ ڈیٹ کر دیے گئے ہیں${syncToApp ? ` اور پوری ایپ میں ${res.updatedAppProductsCount} پروڈکٹس کے کسٹمر ریٹس بھی سنک (اپ ڈیٹ) ہو گئے ہیں!` : '۔'}`;
        successMessageEn = `Updated ${res.updatedSupplierRatesCount} rates for supplier "${res.supplierName}"${syncToApp ? ` and synced ${res.updatedAppProductsCount} customer-facing products across the app!` : '.'}`;
        break;
      }

      case "APPLY_SUPPLIER_MARKUP": {
        const supplierName = payload?.supplierName || targetName || "";
        const supplierId = payload?.supplierId || targetId;
        const markupPercentage = Number(payload?.markupPercentage) || 0;

        if (!supplierName && !supplierId) {
          return NextResponse.json({ error: "Supplier name or ID is required" }, { status: 400 });
        }

        const res = await syncSupplierRatesToEntireApp({
          supplierId,
          supplierName,
          markupPercentage
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to sync supplier rates to app");
        }

        successMessageUr = `سپلائر "${res.supplierName}" کی ریٹ لسٹ کے مطابق (${markupPercentage}% مارک اپ کے ساتھ) پوری ایپ کی ${res.updatedAppProductsCount} پروڈکٹس کے ریٹ اپ ڈیٹ کر دیے گئے ہیں۔`;
        successMessageEn = `Synced ${res.updatedAppProductsCount} app products from supplier "${res.supplierName}" (${markupPercentage}% markup).`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unsupported action type: ${actionType}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      actionType,
      targetId,
      messageUr: successMessageUr,
      messageEn: successMessageEn,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Admin AI Execute Error:", error);
    return NextResponse.json(
      { error: error.message || "Execution failed" },
      { status: 500 }
    );
  }
}
