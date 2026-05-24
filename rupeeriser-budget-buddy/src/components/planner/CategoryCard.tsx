// NEW FILE: Reusable Category Card Component
import { PlanCategory } from '@/types/planner';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: PlanCategory;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const percentage = category.amount > 0 ? (category.spent / category.amount) * 100 : 0;
  const isOverspent = category.spent > category.amount;

  const priorityColors = {
    essential: 'bg-red-50 dark:bg-red-950/20',
    important: 'bg-blue-50 dark:bg-blue-950/20',
    optional: 'bg-gray-50 dark:bg-gray-950/20',
  };

  const priorityTextColors = {
    essential: 'text-red-600 dark:text-red-400',
    important: 'text-blue-600 dark:text-blue-400',
    optional: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className={cn('rounded-xl p-4 border', priorityColors[category.priority])}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{category.icon}</span>
            <h3 className="font-semibold">{category.name}</h3>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', priorityTextColors[category.priority])}>
              {category.priority}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(category.id)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(category.id)} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">₹{category.spent.toLocaleString()} / ₹{category.amount.toLocaleString()}</span>
          <span className={cn('font-semibold', isOverspent ? 'text-red-600' : 'text-emerald-600')}>
            {isOverspent ? `OVER ₹${(category.spent - category.amount).toLocaleString()}` : `₹${(category.amount - category.spent).toLocaleString()} left`}
          </span>
        </div>

        {isOverspent && (
          <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-900/40 rounded-lg flex gap-2 items-center">
            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">Exceeded by ₹{(category.spent - category.amount).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}