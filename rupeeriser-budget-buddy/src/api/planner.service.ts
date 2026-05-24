// NEW FILE: Planner API Service
import { apiClient } from './client';
import { MonthlyPlan, PlanningMonth } from '@/types/planner';

export const plannerService = {
  // Get or create monthly plan
  getMonthlyPlan: (month: PlanningMonth) =>
    apiClient.get(`/planner/month/${month}`),

  // List all monthly plans
  getAllPlans: () =>
    apiClient.get('/planner/plans'),

  // Create new monthly plan
  createMonthlyPlan: (data: Omit<MonthlyPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post('/planner/plans', data),

  // Update monthly plan
  updateMonthlyPlan: (planId: string, data: Partial<MonthlyPlan>) =>
    apiClient.put(`/planner/plans/${planId}`, data),

  // Add category to plan
  addCategory: (planId: string, category: Omit<PlanCategory, 'id' | 'spent'>) =>
    apiClient.post(`/planner/plans/${planId}/categories`, category),

  // Update category
  updateCategory: (planId: string, categoryId: string, data: Partial<PlanCategory>) =>
    apiClient.put(`/planner/plans/${planId}/categories/${categoryId}`, data),

  // Delete category
  deleteCategory: (planId: string, categoryId: string) =>
    apiClient.delete(`/planner/plans/${planId}/categories/${categoryId}`),

  // Copy previous month plan
  copyFromPreviousMonth: (fromMonth: PlanningMonth, toMonth: PlanningMonth) =>
    apiClient.post('/planner/copy-plan', { fromMonth, toMonth }),

  // Get plan statistics
  getPlanStats: (planId: string) =>
    apiClient.get(`/planner/plans/${planId}/stats`),
};