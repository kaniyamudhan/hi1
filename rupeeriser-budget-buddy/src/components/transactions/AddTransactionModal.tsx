import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { endpoints } from '@/lib/api';
import { toast } from 'sonner';
import { Transaction } from '@/types/finance';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

const categories = ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Education', 'Bills', 'Other'];

export const AddTransactionModal = ({ isOpen, onClose, transactionToEdit }: AddTransactionModalProps) => {
  const { addTransaction, editTransaction, budget, activeAccount } = useApp();
  const [isParsing, setIsParsing] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');

  // ✅ FIXED: Ensure accounts is always an array
  const availableAccounts = Array.isArray(budget?.accounts) && budget.accounts.length > 0 
    ? budget.accounts 
    : [{ id: 'default', name: 'Cash', type: 'cash', balance: 0 }];

  // 2. Helper to get a valid default account string
  const getDefaultAccount = () => {
    if (activeAccount !== 'all' && activeAccount) return activeAccount;
    return availableAccounts[0]?.name || 'Cash';
  };

  const [formData, setFormData] = useState({
    note: '', 
    amount: '', 
    category: 'Food', 
    account: getDefaultAccount(),
    type: 'expense' as 'expense' | 'income', 
    date: new Date().toISOString().split('T')[0],
  });

  // Reset/Populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setFormData({
          note: transactionToEdit.note,
          amount: transactionToEdit.amount.toString(),
          category: transactionToEdit.category,
          account: transactionToEdit.account || getDefaultAccount(),
          type: transactionToEdit.type,
          date: transactionToEdit.date,
        });
      } else {
        setFormData({
          note: '', 
          amount: '', 
          category: 'Food', 
          account: getDefaultAccount(), // Ensure this is set
          type: 'expense', 
          date: new Date().toISOString().split('T')[0],
        });
        setNaturalInput('');
      }
    }
  }, [isOpen, transactionToEdit, availableAccounts]); // Updated dependency

  // ✅ VALIDATION & SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check specific columns
    if (!formData.note.trim()) { 
        toast.error('Please enter a description'); 
        return; 
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { 
        toast.error('Please enter a valid amount'); 
        return; 
    }
    if (!formData.category) {
        toast.error('Please select a category');
        return;
    }
    if (!formData.account) {
        toast.error('Please select an account');
        return;
    }

    const payload = { ...formData, amount: parseFloat(formData.amount) };

    try {
        if (transactionToEdit) await editTransaction(transactionToEdit.id, payload);
        else await addTransaction(payload);
        onClose();
    } catch (error) { 
        toast.error("Failed to save transaction"); 
    }
  };

  // ✅ AI PARSE WITH SMART ACCOUNT SELECTION
  const handleParse = async () => {
    if (!naturalInput.trim()) return;
    setIsParsing(true);
    try {
      const res = await endpoints.parseAI(naturalInput);
      const data = res.data;

      // Smart Account Matcher:
      // Check if AI's suggested account exists in our list (case-insensitive)
      let matchedAccount = getDefaultAccount(); // Default fallback
      
      // ✅ FIXED: Check if availableAccounts is array before using .find()
      if (data.account && Array.isArray(availableAccounts)) {
          const found = availableAccounts.find(
              acc => acc.name.toLowerCase() === data.account.toLowerCase()
          );
          if (found) matchedAccount = found.name;
      }

      setFormData(prev => ({
        ...prev,
        amount: data.amount.toString(),
        category: data.category || "Other",
        note: data.note,
        date: data.date || prev.date,
        type: (data.type === 'income' || data.type === 'expense') ? data.type : 'expense',
        account: matchedAccount // Set the matched or default account
      }));
      
      toast.success("AI filled the details! Verify account & category.");
    } catch (error) { 
        toast.error("AI couldn't understand that."); 
    } 
    finally { setIsParsing(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-sm w-[90%] border-primary/20 p-5 rounded-3xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="font-display text-lg text-center">{transactionToEdit ? 'Edit Transaction' : 'New Entry'}</DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground hidden">Transaction Details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!transactionToEdit && (
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-800">
              <Label className="text-blue-600 flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-wider"><Sparkles className="w-3 h-3" /> AI Quick Add</Label>
              <div className="flex gap-2">
                <Input value={naturalInput} onChange={(e) => setNaturalInput(e.target.value)} placeholder='e.g., "Lunch 150"' className="bg-background/80 h-9 text-sm"/>
                <Button type="button" onClick={handleParse} disabled={isParsing} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 rounded-xl">
                  {isParsing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Description</Label>
                <Input value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="input-glass mt-1 h-10 text-sm" placeholder="What's this for?"/>
              </div>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-glass mt-1 font-mono font-bold text-base h-10" placeholder="0"/>
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-glass mt-1 h-10 text-sm" />
              </div>
              
              {/* Category Select */}
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="input-glass mt-1 h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              {/* Account Select */}
              <div>
                <Label className="text-xs">Account</Label>
                <Select value={formData.account} onValueChange={(v) => setFormData({ ...formData, account: v })}>
                  <SelectTrigger className="input-glass mt-1 h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((acc, idx) => (
                      <SelectItem key={`${acc.id}-${idx}`} value={acc.name}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, type: 'expense' })} 
                className={`flex-1 rounded-xl h-10 text-xs font-medium transition-all ${formData.type === 'expense' ? 'bg-red-500 text-white hover:bg-red-600 border-red-500' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Expense
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`flex-1 rounded-xl h-10 text-xs font-medium transition-all ${formData.type === 'income' ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Income
              </Button>
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm h-11 mt-2 shadow-lg shadow-blue-500/20">
              {transactionToEdit ? 'Update' : 'Save Entry'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
