// NEW FILE: Planner API Service
import { client } from './client';
import { MonthlyPlan, PlanCategory, PlanningMonth } from '@/types/planner';

export const plannerService = {
  // Get or create monthly plan
  getMonthlyPlan: (month: PlanningMonth) =>
    client.get(`/planner/month/${month}`),

  // List all monthly plans
  getAllPlans: () =>
    client.get('/planner/plans'),

  // Create new monthly plan
  createMonthlyPlan: (data: Omit<MonthlyPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    client.post('/planner/plans', data),

  // Update monthly plan
  updateMonthlyPlan: (planId: string, data: Partial<MonthlyPlan>) =>
    client.put(`/planner/plans/${planId}`, data),

  // Add category to plan
  addCategory: (planId: string, category: Omit<PlanCategory, 'id' | 'spent'>) =>
    client.post(`/planner/plans/${planId}/categories`, category),

  // Update category
  updateCategory: (planId: string, categoryId: string, data: Partial<PlanCategory>) =>
    client.put(`/planner/plans/${planId}/categories/${categoryId}`, data),

  // Delete category
  deleteCategory: (planId: string, categoryId: string) =>
    client.delete(`/planner/plans/${planId}/categories/${categoryId}`),

  // Copy previous month plan
  copyFromPreviousMonth: (fromMonth: PlanningMonth, toMonth: PlanningMonth) =>
    client.post('/planner/copy-plan', { fromMonth, toMonth }),

  // Get plan statistics
  getPlanStats: (planId: string) =>
    client.get(`/planner/plans/${planId}/stats`),
};