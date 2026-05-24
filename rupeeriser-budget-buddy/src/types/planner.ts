export type PlanningMonth = string; // Format: "2024-05"

export interface PlanCategory {
  id: string;
  name: string;
  amount: number;
  spent: number;
  isPaid?: boolean;
  icon?: string;
  priority: 'essential' | 'important' | 'optional';
}

export interface MonthlyPlan {
  id: string;
  userId: string;
  month: PlanningMonth;
  salary: number;
  categories: PlanCategory[];
  totalPlanned: number;
  totalSpent: number;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
  copiedFromMonth?: PlanningMonth;
  notes?: string;
}

export interface MonthlyPlannerStats {
  totalAllocated: number;
  remaining: number;
  overspent: number;
  utilizationPercentage: number;
  categoriesOnTrack: number;
  categoriesExceeded: number;
  completionScore: number;
}

export interface AllocationAlert {
  type: 'overspending' | 'on-track' | 'saved';
  categoryId: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}
