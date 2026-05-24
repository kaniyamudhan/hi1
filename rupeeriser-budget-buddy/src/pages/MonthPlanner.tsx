// NEW FILE
import { useState, useEffect } from 'react';
import { usePlanner } from '@/contexts/PlannerContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  TrendingUp,
  Target,
  PiggyBank,
  Trash2,
  Edit2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function MonthlyPlanner() {
  const navigate = useNavigate();
  const { currentMonthPlan, addCategory, deleteCategory, copyPreviousMonthPlan, calculateMonthlyStats, loadMonthlyPlan } = usePlanner();
  const { budget } = useApp();

  const currentDate = new Date();
  const [displayMonth, setDisplayMonth] = useState<string>(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  );

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');
  const [newCategoryPriority, setNewCategoryPriority] = useState<'essential' | 'important' | 'optional'>('important');

  useEffect(() => {
    loadMonthlyPlan(displayMonth);
  }, [displayMonth, loadMonthlyPlan]);

  const stats = calculateMonthlyStats();

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryAmount || !currentMonthPlan) return;

    await addCategory({
      name: newCategoryName,
      amount: parseFloat(newCategoryAmount),
      priority: newCategoryPriority,
      icon: '💰',
    });

    setNewCategoryName('');
    setNewCategoryAmount('');
  };

  const handleCopyPreviousMonth = async () => {
    const [year, month] = displayMonth.split('-').map(Number);
    const prevMonth = month === 1 
      ? `${year - 1}-12` 
      : `${year}-${String(month - 1).padStart(2, '0')}`;

    await copyPreviousMonthPlan(prevMonth, displayMonth);
  };

  const changeMonth = (offset: number) => {
    const [year, month] = displayMonth.split('-').map(Number);
    let newMonth = month + offset;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setDisplayMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const priorityColors = {
    essential: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    important: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    optional: 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800',
  };

  const priorityBadge = {
    essential: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    important: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    optional: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
  };

  const monthDisplay = new Date(`${displayMonth}-01`).toLocaleDateString('en-IN', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-40 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Monthly Financial Planner</h1>
          <p className="text-sm text-muted-foreground">Plan & track your budget month by month</p>
        </div>
      </div>

      {/* MONTH SELECTOR */}
      <div className="flex items-center gap-4 mb-8 bg-card p-4 rounded-2xl border">
        <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="rounded-lg">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="text-sm text-muted-foreground">Planning for</p>
          <p className="text-2xl font-bold">{monthDisplay}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="rounded-lg">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={handleCopyPreviousMonth} className="gap-2 rounded-lg">
          <Copy className="w-4 h-4" />
          Copy Previous
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-muted-foreground">Allocated</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">₹{stats.totalAllocated.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">of ₹{budget.salary.toLocaleString()}</p>
        </div>

        <div className={cn(
          "border rounded-2xl p-4",
          stats.remaining >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-muted-foreground">Remaining</span>
          </div>
          <p className={cn("text-2xl font-bold", stats.remaining >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            ₹{Math.abs(stats.remaining).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Unallocated</p>
        </div>

        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-muted-foreground">Utilization</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{Math.round(stats.utilizationPercentage)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Budget used</p>
        </div>

        <div className={cn(
          "border rounded-2xl p-4",
          stats.completionScore >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-card'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">Score</span>
          </div>
          <p className={cn("text-2xl font-bold", stats.completionScore >= 80 ? 'text-emerald-600' : 'text-amber-600')}>
            {Math.round(stats.completionScore)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Plan health</p>
        </div>
      </div>

      {/* ADD NEW CATEGORY */}
      <div className="bg-card border rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Add Budget Category
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input
            placeholder="e.g., Rent, Food"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            className="rounded-lg"
          />
          <Input
            type="number"
            placeholder="Amount"
            value={newCategoryAmount}
            onChange={(e) => setNewCategoryAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            className="rounded-lg"
          />
          <select
            value={newCategoryPriority}
            onChange={(e) => setNewCategoryPriority(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
          >
            <option value="essential">Essential</option>
            <option value="important">Important</option>
            <option value="optional">Optional</option>
          </select>
          <Button 
            onClick={handleAddCategory} 
            className="bg-blue-600 hover:bg-blue-700 rounded-lg text-white gap-2 col-span-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      {/* CATEGORIES LIST */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Budget Categories</h2>
        
        {!currentMonthPlan || currentMonthPlan.categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-2xl bg-card">
            <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No categories added yet. Create your first budget category above.</p>
          </div>
        ) : (
          currentMonthPlan.categories.map((cat) => {
            const percentage = cat.amount > 0 ? (cat.spent / cat.amount) * 100 : 0;
            const isOverspent = cat.spent > cat.amount;

            return (
              <div
                key={cat.id}
                className={cn(
                  'border rounded-2xl p-4 transition-all',
                  priorityColors[cat.priority],
                  isOverspent && 'ring-2 ring-red-500'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-bold text-lg">{cat.name}</h3>
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', priorityBadge[cat.priority])}>
                          {cat.priority.charAt(0).toUpperCase() + cat.priority.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => deleteCategory(cat.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>₹{cat.spent.toLocaleString()} / ₹{cat.amount.toLocaleString()}</span>
                  <span className={cn('font-semibold', isOverspent ? 'text-red-600' : 'text-emerald-600')}>
                    {isOverspent ? `OVER ₹${(cat.spent - cat.amount).toLocaleString()}` : `₹${(cat.amount - cat.spent).toLocaleString()} left`}
                  </span>
                </div>

                {/* Overspending Alert */}
                {isOverspent && (
                  <div className="p-3 bg-red-100/50 dark:bg-red-900/30 rounded-lg flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">Overspending Alert</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Exceeded by ₹{(cat.spent - cat.amount).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}