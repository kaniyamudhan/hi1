import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export const AccountSelectionModal = () => {
  const { user, budget, activeAccount, setActiveAccount, createAccount } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  
  // Create Form State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('bank'); // Default is 'bank'

  useEffect(() => {
    // Open if user is logged in BUT no account is selected (or set to 'all' initially)
    if (user && activeAccount === 'all') {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user, activeAccount]);

  const handleSelect = (accountName: string) => {
    console.log('✅ Selected account:', accountName);
    setActiveAccount(accountName);
    setIsOpen(false);
    toast.success(`Switched to ${accountName}`);
  };

  const handleCreate = async () => {
    console.log('📝 Creating account:', { name: newName, type: newType });
    
    if (!newName || !newName.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (!newType) {
      toast.error("Account type is required");
      return;
    }
    
    try {
      console.log('🚀 Calling createAccount API...');
      await createAccount({
        name: newName.trim(),
        type: newType as any,
        balance: 0 // Default balance is now always 0
      });
      console.log('✅ Account created successfully');
      setActiveAccount(newName.trim()); // Auto select new account
      setIsOpen(false);
      setShowCreate(false);
      setNewName(''); // Reset form
      setNewType('bank');
      toast.success(`Account "${newName}" created!`);
    } catch (e: any) {
      console.error('❌ Error creating account:', e);
      toast.error(e?.response?.data?.error?.message || "Failed to create account");
    }
  };

  // ✅ FIX: Ensure accounts is always an array with valid keys
  const accounts = Array.isArray(budget?.accounts) ? budget.accounts : [];

  console.log('📊 Accounts in modal:', accounts);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      {/* preventDefault onInteractOutside forces user to choose */}
      <DialogContent className="glass-card sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Select Active Account</DialogTitle>
          <DialogDescription>
            Choose which wallet/bank you want to manage right now.
          </DialogDescription>
        </DialogHeader>

        {!showCreate ? (
          <div className="space-y-4">
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {accounts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No accounts found. Create one to get started!</p>
              )}
              {accounts.map((acc, idx) => {
                // ✅ FIX: Use a combination of id and name as key, with fallback to index
                const uniqueKey = acc.id || `${acc.name}-${idx}`;
                return (
                  <Button
                    key={uniqueKey}
                    variant="outline"
                    className="w-full justify-between h-14 rounded-xl border-primary/20 hover:bg-primary/10 transition-all"
                    onClick={() => handleSelect(acc.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Wallet className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{acc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                      </div>
                    </div>
                    {/* Optional: Remove displaying balance here if you don't want it shown yet */}
                    {/* <span className="font-mono">₹{acc.balance.toLocaleString()}</span> */}
                  </Button>
                );
              })}
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
            </div>

            <Button 
              onClick={() => setShowCreate(true)} 
              className="w-full gradient-primary rounded-xl hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> Create New Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            <div>
              <label className="text-xs font-medium mb-1 block">Account Name</label>
              <Input 
                placeholder="e.g., SBI Savings" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="input-glass rounded-xl h-11"
                autoFocus
              />
            </div>
            
            <div>
              <label className="text-xs font-medium mb-1 block">Account Type</label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="input-glass rounded-xl h-11">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">🏦 Bank Account (Liquid)</SelectItem>
                  <SelectItem value="wallet">📱 Mobile Wallet (Liquid)</SelectItem>
                  <SelectItem value="cash">💵 Physical Cash (Liquid)</SelectItem>
                  <SelectItem value="investment">📈 Investment/Fixed (Illiquid)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Balance Input Removed */}
            
            <div className="flex gap-2 pt-2">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                  setNewType('bank');
                }} 
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleCreate} 
                className="flex-1 gradient-primary rounded-xl hover:opacity-90 transition-all"
                disabled={!newName.trim()}
              >
                Create Account
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};