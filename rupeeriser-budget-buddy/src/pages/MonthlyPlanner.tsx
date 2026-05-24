import React, { useEffect, useState } from 'react';
import { usePlanner } from '@/contexts/PlannerContext';
import { PlanCategory, PlanningMonth } from '@/types/planner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const MonthlyPlanner = () => {
  const {
    currentMonthPlan,
    isLoading,
    loadMonthlyPlan,
    createNewMonthlyPlan,
    addCategory,
    updateCategory,
    deleteCategory,
  } = usePlanner();

  const [currentMonth, setCurrentMonth] = useState<PlanningMonth>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');
  const [newCategoryPriority, setNewCategoryPriority] = useState<'essential' | 'important' | 'optional'>('important');
  const [salary, setSalary] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');

  useEffect(() => {
    loadMonthlyPlan(currentMonth);
  }, [currentMonth, loadMonthlyPlan]);

  const handleCreatePlan = async () => {
    if (!salary) {
      toast.error('Please enter your salary');
      return;
    }
    await createNewMonthlyPlan(parseFloat(salary), currentMonth);
    setSalary('');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    const newCategory: Omit<PlanCategory, 'id' | 'spent'> = {
      name: newCategoryName,
      amount: parseFloat(newCategoryAmount),
      priority: newCategoryPriority,
      isPaid: false,
    };

    await addCategory(newCategory);
    setNewCategoryName('');
    setNewCategoryAmount('');
    setNewCategoryPriority('important');
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingAmount) {
      toast.error('Please enter an amount');
      return;
    }

    await updateCategory(categoryId, {
      amount: parseFloat(editingAmount),
    });
    setEditingCategory(null);
    setEditingAmount('');
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(categoryId);
  };

  const monthChange = (direction: 1 | -1) => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth > 12) {
      newYear += 1;
      newMonth = 1;
    } else if (newMonth < 1) {
      newYear -= 1;
      newMonth = 12;
    }

    setCurrentMonth(
      `${newYear}-${String(newMonth).padStart(2, '0')}`
    );
  };

  const totalAllocated = currentMonthPlan?.categories.reduce((sum, cat) => sum + cat.amount, 0) || 0;
  const totalSpent = currentMonthPlan?.categories.reduce((sum, cat) => sum + cat.spent, 0) || 0;
  const remaining = (currentMonthPlan?.salary || 0) - totalAllocated;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Monthly Planner</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => monthChange(-1)}
          >
            ← Previous
          </Button>
          <span className="text-lg font-semibold min-w-24 text-center">
            {new Date(currentMonth + '-01').toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <Button
            variant="outline"
            onClick={() => monthChange(1)}
          >
            Next →
          </Button>
        </div>
      </div>

      {/* Create New Plan */}
      {!currentMonthPlan && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Create Monthly Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter your monthly salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
              <Button onClick={handleCreatePlan} className="bg-blue-600 hover:bg-blue-700">
                Create Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Summary */}
      {currentMonthPlan && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Salary</div>
              <div className="text-2xl font-bold">₹{currentMonthPlan.salary.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Allocated</div>
              <div className="text-2xl font-bold">₹{totalAllocated.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Spent</div>
              <div className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{remaining.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Category */}
      {currentMonthPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Category name (e.g., Rent)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newCategoryAmount}
                onChange={(e) => setNewCategoryAmount(e.target.value)}
              />
              <select
                className="px-3 py-2 border rounded-md bg-background"
                value={newCategoryPriority}
                onChange={(e) =>
                  setNewCategoryPriority(e.target.value as 'essential' | 'important' | 'optional')
                }
              >
                <option value="essential">Essential</option>
                <option value="important">Important</option>
                <option value="optional">Optional</option>
              </select>
              <Button
                onClick={handleAddCategory}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {currentMonthPlan && currentMonthPlan.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentMonthPlan.categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Priority: {category.priority.charAt(0).toUpperCase() + category.priority.slice(1)}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Allocated: ₹{category.amount.toLocaleString()}</span>
                        <span>Spent: ₹{category.spent.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            category.spent > category.amount
                              ? 'bg-red-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              (category.spent / category.amount) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {editingCategory === category.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="New amount"
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(e.target.value)}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateCategory(category.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCategory(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategory(category.id);
                            setEditingAmount(String(category.amount));
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {currentMonthPlan && currentMonthPlan.categories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No categories yet. Add one to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonthlyPlanner;
