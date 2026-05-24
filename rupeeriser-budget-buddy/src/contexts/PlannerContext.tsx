// NEW FILE
import React, { createContext, useContext, useState, useCallback } from 'react';
import { MonthlyPlan, PlanCategory, PlanningMonth, AllocationAlert } from '@/types/planner';
import { plannerApi } from '@/lib/PlannerApi';
import { toast } from 'sonner';

interface PlannerContextType {
  currentMonthPlan: MonthlyPlan | null;
  allPlans: MonthlyPlan[];
  isLoading: boolean;

  loadMonthlyPlan: (month: PlanningMonth) => Promise<void>;
  loadAllPlans: () => Promise<void>;
  createNewMonthlyPlan: (salary: number, month: PlanningMonth) => Promise<void>;
  updateMonthlyPlan: (updates: Partial<MonthlyPlan>) => Promise<void>;

  addCategory: (category: Omit<PlanCategory, 'id' | 'spent'>) => Promise<void>;
  updateCategory: (categoryId: string, updates: Partial<PlanCategory>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  copyPreviousMonthPlan: (fromMonth: PlanningMonth, toMonth: PlanningMonth) => Promise<void>;
  
  getOverspendingAlerts: () => AllocationAlert[];
  calculateMonthlyStats: () => {
    totalAllocated: number;
    remaining: number;
    overspent: number;
    utilizationPercentage: number;
    completionScore: number;
  };
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner must be used within PlannerProvider');
  return context;
};

export const PlannerProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentMonthPlan, setCurrentMonthPlan] = useState<MonthlyPlan | null>(null);
  const [allPlans, setAllPlans] = useState<MonthlyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMonthlyPlan = useCallback(async (month: PlanningMonth) => {
    setIsLoading(true);
    try {
      const res = await plannerApi.getMonthlyPlan(month);
      setCurrentMonthPlan(res.data);
    } catch (err) {
      console.error('Failed to load monthly plan:', err);
      toast.error('Failed to load monthly plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await plannerApi.getAllPlans();
      setAllPlans(res.data);
    } catch (err) {
      console.error('Failed to load all plans:', err);
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewMonthlyPlan = useCallback(async (salary: number, month: PlanningMonth) => {
    try {
      const res = await plannerApi.createMonthlyPlan({
        month,
        salary,
        categories: [],
        totalPlanned: 0,
        totalSpent: 0,
        completionPercentage: 0,
      });
      setCurrentMonthPlan(res.data);
      toast.success('✅ Monthly plan created!');
    } catch (err) {
      console.error('Failed to create plan:', err);
      toast.error('Failed to create monthly plan');
    }
  }, []);

  const updateMonthlyPlan = useCallback(async (updates: Partial<MonthlyPlan>) => {
    if (!currentMonthPlan) return;
    try {
      const res = await plannerApi.updateMonthlyPlan(currentMonthPlan.id, updates);
      setCurrentMonthPlan(res.data);
      toast.success('✅ Plan updated!');
    } catch (err) {
      console.error('Failed to update plan:', err);
      toast.error('Failed to update plan');
    }
  }, [currentMonthPlan]);

  const addCategory = useCallback(async (category: Omit<PlanCategory, 'id' | 'spent'>) => {
    if (!currentMonthPlan) return;
    try {
      const res = await plannerApi.addCategory(currentMonthPlan.id, category);
      setCurrentMonthPlan(res.data);
      toast.success(`✅ "${category.name}" added to plan!`);
    } catch (err) {
      console.error('Failed to add category:', err);
      toast.error('Failed to add category');
    }
  }, [currentMonthPlan]);

  const updateCategory = useCallback(async (categoryId: string, updates: Partial<PlanCategory>) => {
    if (!currentMonthPlan) return;
    try {
      const res = await plannerApi.updateCategory(currentMonthPlan.id, categoryId, updates);
      setCurrentMonthPlan(res.data);
      toast.success('✅ Category updated!');
    } catch (err) {
      console.error('Failed to update category:', err);
      toast.error('Failed to update category');
    }
  }, [currentMonthPlan]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!currentMonthPlan) return;
    try {
      const res = await plannerApi.deleteCategory(currentMonthPlan.id, categoryId);
      setCurrentMonthPlan(res.data);
      toast.success('✅ Category removed!');
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error('Failed to delete category');
    }
  }, [currentMonthPlan]);

  const copyPreviousMonthPlan = useCallback(async (fromMonth: PlanningMonth, toMonth: PlanningMonth) => {
    try {
      const res = await plannerApi.copyFromPreviousMonth(fromMonth, toMonth);
      setCurrentMonthPlan(res.data);
      toast.success('✅ Plan copied from previous month!');
    } catch (err) {
      console.error('Failed to copy plan:', err);
      toast.error('Failed to copy plan');
    }
  }, []);

  const getOverspendingAlerts = useCallback((): AllocationAlert[] => {
    if (!currentMonthPlan) return [];
    
    return currentMonthPlan.categories
      .filter(cat => cat.spent > cat.amount)
      .map(cat => ({
        type: 'overspending' as const,
        categoryId: cat.id,
        message: `${cat.name} exceeded by ₹${(cat.spent - cat.amount).toLocaleString()}`,
        severity: 'critical' as const,
      }));
  }, [currentMonthPlan]);

  const calculateMonthlyStats = useCallback(() => {
    if (!currentMonthPlan) {
      return {
        totalAllocated: 0,
        remaining: 0,
        overspent: 0,
        utilizationPercentage: 0,
        completionScore: 0,
      };
    }

    const totalAllocated = currentMonthPlan.categories.reduce((sum, cat) => sum + cat.amount, 0);
    const totalSpent = currentMonthPlan.categories.reduce((sum, cat) => sum + cat.spent, 0);
    const remaining = currentMonthPlan.salary - totalAllocated;
    const overspent = Math.max(0, totalSpent - currentMonthPlan.salary);
    const utilizationPercentage = currentMonthPlan.salary > 0 ? (totalSpent / currentMonthPlan.salary) * 100 : 0;

    const categoriesCount = currentMonthPlan.categories.length;
    const onTrackCategories = currentMonthPlan.categories.filter(cat => cat.spent <= cat.amount).length;
    const completionScore = categoriesCount > 0 ? (onTrackCategories / categoriesCount) * 100 : 0;

    return {
      totalAllocated,
      remaining,
      overspent,
      utilizationPercentage,
      completionScore,
    };
  }, [currentMonthPlan]);

  return (
    <PlannerContext.Provider
      value={{
        currentMonthPlan,
        allPlans,
        isLoading,
        loadMonthlyPlan,
        loadAllPlans,
        createNewMonthlyPlan,
        updateMonthlyPlan,
        addCategory,
        updateCategory,
        deleteCategory,
        copyPreviousMonthPlan,
        getOverspendingAlerts,
        calculateMonthlyStats,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};