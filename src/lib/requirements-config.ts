
import { Ruler, DraftingCompass, Wind, ChefHat, VenetianMask, Calculator, Wrench, Briefcase, Scissors } from 'lucide-react';
import type { RequirementType } from './types';

export const requirementConfig: Record<RequirementType, { name: string; icon: React.ElementType }> = {
    simple: { name: 'Simple Calculator', icon: Calculator },
    floor: { name: 'Floor Planner', icon: Ruler },
    stairs: { name: 'Stairs', icon: DraftingCompass },
    'window-sill': { name: 'Window Sill', icon: Wind },
    kitchen: { name: 'Kitchen', icon: ChefHat },
    vanity: { name: 'Vanity', icon: VenetianMask },
    'cutting-optimizer': { name: 'Cutting Optimizer (سلیب کٹنگ)', icon: Scissors },
    fixing_material: { name: 'Fixing Material', icon: Wrench },
    labor_quote: { name: 'Labor Quote', icon: Briefcase },
};

export const requirementOptions: { label: string; value: RequirementType; icon: React.ElementType }[] = [
    { label: 'Simple Calculator', value: 'simple', icon: Calculator },
    { label: 'Floor Planner', value: 'floor', icon: Ruler },
    { label: 'Window Sill', value: 'window-sill', icon: Wind },
    { label: 'Stairs', value: 'stairs', icon: DraftingCompass },
    { label: 'Kitchen', value: 'kitchen', icon: ChefHat },
    { label: 'Vanity', value: 'vanity', icon: VenetianMask },
    { label: 'Cutting Optimizer (سلیب کٹنگ)', value: 'cutting-optimizer', icon: Scissors },
    { label: 'Labor Quote', value: 'labor_quote', icon: Briefcase },
];
