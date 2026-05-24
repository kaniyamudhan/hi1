// UPDATED FILE: New Financial Setup Page
import { useState, useEffect } from 'react';
import { usePlanner } from '@/contexts/PlannerContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Landmark, Plus, ArrowLeft, Wallet, Calculator, PiggyBank, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FinancialSetupV2() {
  const navigate = useNavigate();
  const { currentMonthPlan, createNewMonthlyPlan, updateMonthlyPlan } = usePlanner();
  const { budget } = useApp();
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSalaryInput(budget.salary.toString());
  }, [budget.salary]);

  const handleSaveSalary = async () => {
    if (!salaryInput) return;
    setIsSaving(true);
    
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    if (!currentMonthPlan) {
      await createNewMonthlyPlan(Number(salaryInput), currentMonth as any);
    } else {
      await updateMonthlyPlan({ salary: Number(salaryInput) });
    }
    
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-32 px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Financial Setup v2</h1>
          <p className="text-xs text-muted-foreground">Configure your monthly income</p>
        </div>
      </div>

      <div className="bg-card border rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Monthly Income</h3>
            <p className="text-xs text-muted-foreground">Set your primary income</p>
          </div>
        </div>

        <div className="bg-secondary/30 rounded-2xl p-5">
          <label className="text-blue-600 font-bold text-sm mb-2 block">Monthly Salary</label>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-muted-foreground">₹</span>
            <Input
              type="number"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              className="bg-transparent border-none shadow-none text-2xl font-bold h-10 p-0 focus-visible:ring-0"
              placeholder="0"
            />
          </div>
        </div>

        <Button onClick={handleSaveSalary} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-white">
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </Button>

        <Button onClick={() => navigate('/planner')} variant="outline" className="w-full h-12 rounded-xl">
          Go to Monthly Planner
        </Button>
      </div>
    </div>
  );
}