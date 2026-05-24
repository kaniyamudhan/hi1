// NEW FILE - Using existing endpoints pattern
import { endpoints } from './api';
import { MonthlyPlan, PlanningMonth, PlanCategory } from '@/types/planner';

export const plannerApi = {
  // Get or create monthly plan
  getMonthlyPlan: (month: PlanningMonth) =>
    endpoints.getMonthlyPlan(month),

  // List all monthly plans
  getAllPlans: () =>
    endpoints.getAllPlans(),

  // Create new monthly plan
  createMonthlyPlan: (data: any) =>
    endpoints.createMonthlyPlan(data),

  // Update monthly plan
  updateMonthlyPlan: (planId: string, data: any) =>
    endpoints.updateMonthlyPlan(planId, data),

  // Add category to plan
  addCategory: (planId: string, category: any) =>
    endpoints.addCategoryToPlan(planId, category),

  // Update category
  updateCategory: (planId: string, categoryId: string, data: any) =>
    endpoints.updateCategoryInPlan(planId, categoryId, data),

  // Delete category
  deleteCategory: (planId: string, categoryId: string) =>
    endpoints.deleteCategoryFromPlan(planId, categoryId),

  // Copy previous month plan
  copyFromPreviousMonth: (fromMonth: PlanningMonth, toMonth: PlanningMonth) =>
    endpoints.copyMonthlyPlan(fromMonth, toMonth),

  // Get plan statistics
  getPlanStats: (planId: string) =>
    endpoints.getMonthlyPlanStats(planId),
};
