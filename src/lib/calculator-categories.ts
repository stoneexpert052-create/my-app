import type { Marble, Requirement } from './types';

export const DEFAULT_CALCULATOR_CATEGORIES: Record<string, string[]> = {
  simple: ["Local Marble", "Imported Marble", "MDM Material", "Limestone"],
  floor: ["Local Marble", "Imported Marble", "MDM Material", "Marble Tiles", "Limestone"],
  kitchen: ["Local Granite", "Imported Granite", "Artificial Stone", "Corian"],
  vanity: ["Vanity", "Imported Granite", "Local Granite", "Artificial Stone", "Corian"],
  "window-sill": ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material", "Limestone"],
  stairs: ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material"],
  "cutting-optimizer": ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material", "Limestone"],
  facade: ["Facade Stone"]
};

/**
 * Derives the canonical category name for a given marble product.
 */
export function getMarbleCategory(m: { category?: string; materialType: string; origin?: string }): string {
  if (m.category && m.category.trim() !== '') {
    return m.category;
  }
  if (m.materialType === '12x24 Tiles') {
    return 'Marble Tiles';
  }
  if (m.materialType === 'Marble' || m.materialType === 'Granite') {
    return `${m.origin || 'Local'} ${m.materialType}`;
  }
  return m.materialType;
}

/**
 * Identifies if a marble product represents facade stone, wall cladding, or exterior elevation.
 */
export function isFacadeMarble(m?: { materialType?: string; category?: string; name?: string } | null): boolean {
  if (!m) return false;
  if (m.materialType === 'Facade Stone' || m.category === 'Facade Stone') return true;
  const name = (m.name || '').toLowerCase();
  if (
    name.includes('facade') || 
    name.includes('فیساڈ') || 
    name.includes('فسارڈ') || 
    name.includes('cladding') || 
    name.includes('rock wall') || 
    name.includes('ایلیویشن') ||
    name.includes('elevation')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether an item or requirement represents a facade / exterior wall stone cladding.
 * Non-facade types (kitchen, floor, vanity, stairs, window-sill) are strictly NOT facade items.
 */
export function isFacadeItem(item?: { 
  type?: string; 
  name?: string; 
  marble?: { materialType?: string; category?: string; name?: string } | null 
} | null): boolean {
  if (!item) return false;
  
  // Explicit non-facade requirement types can NEVER be facade items
  const nonFacadeTypes = ['kitchen', 'floor', 'vanity', 'stairs', 'window-sill', 'cutting-optimizer'];
  if (item.type && nonFacadeTypes.includes(item.type)) {
    return false;
  }

  if (item.type === 'facade') return true;

  const reqName = (item.name || '').toLowerCase();
  if (
    reqName.includes('facade') || 
    reqName.includes('exterior') || 
    reqName.includes('elevation') || 
    reqName.includes('فیساڈ') || 
    reqName.includes('فسارڈ') || 
    reqName.includes('ایلیویشن') ||
    reqName.includes('وال کلاڈنگ')
  ) {
    return true;
  }

  // Only for 'simple' or unspecified type where requirement name doesn't specify another purpose:
  if ((!item.type || item.type === 'simple') && item.marble && isFacadeMarble(item.marble)) {
    return true;
  }

  return false;
}

/**
 * Returns the recommended categories configured for a requirement.
 */
export function getRecommendedCategoriesForRequirement(
  req: Requirement,
  calculatorCategories?: Record<string, string[]> | null
): string[] {
  // If the requirement is specifically for a facade stone
  if (isFacadeItem(req)) {
    const facadeCats = calculatorCategories?.['facade'];
    if (facadeCats && Array.isArray(facadeCats) && facadeCats.length > 0) {
      return facadeCats;
    }
    return DEFAULT_CALCULATOR_CATEGORIES.facade;
  }

  const reqType = req.type || 'simple';
  const custom = calculatorCategories?.[reqType];
  if (custom && Array.isArray(custom) && custom.length > 0) {
    return custom;
  }

  return DEFAULT_CALCULATOR_CATEGORIES[reqType] || DEFAULT_CALCULATOR_CATEGORIES.simple;
}

/**
 * Filters marbles list based on requirement type and active category filter.
 */
export function filterMarblesForRequirement(
  marblesList: Marble[],
  req: Requirement,
  calculatorCategories?: Record<string, string[]> | null,
  activeFilter: string = 'recommended'
): Marble[] {
  const isFacade = isFacadeItem(req);
  const recommendedCategories = getRecommendedCategoriesForRequirement(req, calculatorCategories);

  return marblesList
    .filter(m => !m.isHidden && m.id !== 'general-supplies-order')
    .filter(m => {
      const cat = getMarbleCategory(m);
      const isFacadeM = isFacadeMarble(m);

      // Architectural Rule 1: Facade stones can ONLY ever be used for Facade requirements.
      // They must NEVER leak into Kitchen, Stairs, Floor, Vanity, or Window-sill comparisons!
      if (!isFacade && isFacadeM) {
        return false;
      }

      // Architectural Rule 2: If this IS a facade requirement, only facade stones are permitted!
      if (isFacade) {
        return isFacadeM || cat === 'Facade Stone' || m.materialType === 'Facade Stone';
      }

      // Specific requirement restrictions
      if (req.type === 'kitchen') {
        // Kitchen counter tops: Granite, Artificial Stone, Corian, or dense slabs.
        // NEVER tiles or facade stone
        if (m.materialType === '12x24 Tiles' || isFacadeM) return false;
      } else if (req.type === 'stairs') {
        if (m.materialType === '12x24 Tiles' || isFacadeM) return false;
      } else if (req.type === 'vanity') {
        if (m.materialType === '12x24 Tiles' || isFacadeM) return false;
      } else if (req.type === 'window-sill') {
        if (m.materialType === '12x24 Tiles' || isFacadeM) return false;
      } else if (req.type === 'simple' || req.type === 'floor') {
        if (m.materialType === 'Corian' || isFacadeM) return false;
      }

      if (activeFilter === 'recommended') {
        return recommendedCategories.includes(cat);
      }

      if (activeFilter !== 'all') {
        return cat === activeFilter;
      }

      return true;
    });
}

/**
 * Human-readable description of the recommendation context.
 */
export function getRequirementRecommendationTitle(req: Requirement, language: 'ur' | 'en'): { label: string; description: string } {
  if (isFacadeItem(req)) {
    return {
      label: language === 'ur' ? 'فیساڈ / فرنٹ وال اسٹون' : 'Facade & Wall Cladding Stone',
      description: language === 'ur'
        ? 'ایڈمن پینل کے مطابق بیرونی دیواروں اور فیساڈ کے لیے موزوں پتھر'
        : 'Materials configured in Admin Panel for exterior walls & facade cladding'
    };
  }

  switch (req.type) {
    case 'kitchen':
      return {
        label: language === 'ur' ? 'کچن کاؤنٹر ٹاپ کے تجویز کردہ مواد' : 'Kitchen Countertop Materials',
        description: language === 'ur'
          ? 'ایڈمن پینل کے مطابق کچن سلیب کے لیے تجویز کردہ گرینائٹ، کورین اور آرٹیفیشل پتھر'
          : 'Materials configured in Admin Panel for Kitchen tops (Granites, Corian & Artificial Stones)'
      };
    case 'stairs':
      return {
        label: language === 'ur' ? 'سیڑھیوں کے تجویز کردہ مواد' : 'Stairs Recommended Materials',
        description: language === 'ur'
          ? 'ایڈمن پینل کے مطابق سیڑھیوں کے ٹریڈ اور رائزر کے لیے پائیدار ماربل اور گرینائٹ'
          : 'Durable marbles & granites configured in Admin Panel for stair treads & risers'
      };
    case 'floor':
      return {
        label: language === 'ur' ? 'فلورنگ کے تجویز کردہ مواد' : 'Flooring Recommended Materials',
        description: language === 'ur'
          ? 'ایڈمن پینل کے مطابق کمروں کے فرش اور اسکرٹنگ کے لیے موزوں ماربل اور ٹائلز'
          : 'Marbles, MDM & tiles configured in Admin Panel for room floors'
      };
    case 'vanity':
      return {
        label: language === 'ur' ? 'وینٹی کاؤنٹر کے تجویز کردہ مواد' : 'Vanity Countertop Materials',
        description: language === 'ur'
          ? 'ایڈمن پینل کے مطابق باتھ روم وینٹی کے لیے تجویز کردہ مواد'
          : 'Materials configured in Admin Panel for bathroom vanities'
      };
    case 'window-sill':
      return {
        label: language === 'ur' ? 'کھڑکی چوکھٹ کے تجویز کردہ مواد' : 'Window Sill Materials',
        description: language === 'ur'
          ? 'ایڈمن پینل کے مطابق کھڑکی کی سل اور بارڈر کے لیے تجویز کردہ مواد'
          : 'Materials configured in Admin Panel for window sills and borders'
      };
    case 'simple':
    default:
      return {
        label: language === 'ur' ? 'تجویز کردہ مواد' : 'Recommended Materials',
        description: language === 'ur'
          ? 'ایڈمن پینل کی سیٹنگز کے مطابق تجویز کردہ مٹیریلز'
          : 'Materials configured in Admin Panel for this application'
      };
  }
}
