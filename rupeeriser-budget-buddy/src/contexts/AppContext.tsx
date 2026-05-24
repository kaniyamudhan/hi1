import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { endpoints } from '@/lib/api';
import { User, Transaction, Account, Goal, Budget, Habit } from '@/types/finance';

interface AppContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  
  login: (token: string, name: string) => void; 
  signup: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: { 
    current_password: string; 
    new_password: string; 
    plain_text_password?: string; 
  }) => Promise<void>;

  transactions: Transaction[]; 
  allTransactions: Transaction[]; 
  addTransaction: (data: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  editTransaction: (id: string, data: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  budget: Budget;
  setBudget: React.Dispatch<React.SetStateAction<Budget>>;
  updateBudgetSettings: (salary: number, fixedCosts: any, config?: string) => Promise<void>;
  activeAccount: string;
  setActiveAccount: React.Dispatch<React.SetStateAction<string>>;
  createAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  addGoal: (data: Omit<Goal, 'id'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  setChatMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
  
  habits: Habit[];
  addHabit: (name: string) => Promise<void>;
  toggleHabitCheck: (id: string, date: string, completed: boolean) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  seedHabits: () => Promise<void>;

  language: 'EN' | 'TA' | 'HI';
  setLanguage: React.Dispatch<React.SetStateAction<'EN' | 'TA' | 'HI'>>;

  // ✅ NEW: Flag to prevent auto-setting active account on first login
  hasShownAccountSelection: boolean;
  setHasShownAccountSelection: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  const [budget, setBudget] = useState<Budget>({
    salary: 0,
    fixedCosts: { rent: 0, travel: 0, phone: 0, subscriptions: 0 },
    config: "",
    goals: [],
    accounts: [],
  });
  
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [language, setLanguage] = useState<'EN' | 'TA' | 'HI'>('EN');
  const [hasShownAccountSelection, setHasShownAccountSelection] = useState(false);

  // ✅ Persist language preference to localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang === 'EN' || savedLang === 'TA' || savedLang === 'HI') {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // ✅ Filter transactions by active account
  const transactions = useMemo(() => {
    if (activeAccount === 'all') return allTransactions;
    return allTransactions.filter(t => t.account && t.account.toLowerCase() === activeAccount.toLowerCase());
  }, [allTransactions, activeAccount]);

  // ✅ Auto-load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      endpoints.getMe()
        .then((res) => {
          setUser(res.data);
          fetchData(res.data._id || res.data.id);
        })
        .catch((err) => {
          console.error('❌ Failed to auto-load user:', err);
          logout();
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // ✅ Fetch data from backend ONLY - NO localStorage fallback
  // ✅ FIXED: Don't auto-set activeAccount on login, wait for user to choose
  const fetchData = useCallback(async (userId: string) => {
    try {
      // ✅ Fetch transactions
      let allTxn: Transaction[] = [];
      try {
        const txRes = await endpoints.getTransactions();
        allTxn = txRes.data.transactions || [];
      } catch (txErr: any) {
        console.error('❌ Failed to fetch transactions:', txErr);
        allTxn = [];
      }
      
      // ✅ Fetch accounts
      let accountsList: Account[] = [];
      try {
        const accRes = await endpoints.getAccounts();
        accountsList = accRes.data.accounts || [];
      } catch (accErr: any) {
        console.error('❌ Failed to fetch accounts:', accErr);
        accountsList = [];
      }
      
      // ✅ Update state with backend data
      setAllTransactions(allTxn);
      setBudget(prev => ({...prev, accounts: accountsList}));
      
      // ✅ FIXED: Only auto-set active account if user hasn't been shown selection modal yet
      if (accountsList.length > 0 && !hasShownAccountSelection) {
        // Keep activeAccount as 'all' - let AccountSelectionModal handle the choice
        setActiveAccount('all');
        setHasShownAccountSelection(true);
      } else if (accountsList.length === 0) {
        // No accounts? Keep as 'all' so user sees "create account" in modal
        setActiveAccount('all');
      }
      
    } catch (error) {
      console.error("❌ Failed to fetch data:", error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [hasShownAccountSelection]);

  // ✅ Login
  const login = (token: string, name: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user_name', name);
    setHasShownAccountSelection(false); // ✅ Reset flag on login
    
    endpoints.getMe()
      .then(res => {
        setUser(res.data);
        fetchData(res.data._id || res.data.id);
      })
      .catch(err => {
        console.error('❌ Failed to get user data:', err);
        toast.error('Failed to load user data');
      });
  };

  // ✅ Signup
  const signup = async (data: { name: string; email: string; password: string }) => {
    const res = await endpoints.signup(data);
    localStorage.setItem('token', res.data.access_token);
    const userData = { id: '', name: res.data.user_name, email: data.email };
    setUser(userData as User);
    setHasShownAccountSelection(false); // ✅ Reset flag on signup
    await fetchData(userData.id);
  };

  // ✅ Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    
    setUser(null);
    setAllTransactions([]);
    setBudget(prev => ({...prev, accounts: []}));
    setActiveAccount('all');
    setHasShownAccountSelection(false); // ✅ Reset flag on logout
    setHabits([]);
    queryClient.clear();
  };

  // ✅ Update profile
  const updateProfile = async (data: Partial<User>) => {
    try {
      await endpoints.updateProfile(data); 
      setUser(prev => prev ? { ...prev, ...data } : null);
      toast.success('✅ Profile updated!');
    } catch (err) {
      console.error("Profile update error", err);
      toast.error('Failed to update profile');
      throw err;
    }
  };

  // ✅ Change password
  const changePassword = async (data: { current_password: string; new_password: string; plain_text_password?: string }) => {
    try {
      await endpoints.changePassword(data);
      toast.success('✅ Password changed!');
    } catch (err) {
      console.error("Password change error", err);
      toast.error('Failed to change password');
      throw err;
    }
  };

  // ✅ Add transaction
  const addTransaction = async (data: Omit<Transaction, 'id' | 'user_id'>) => {
    try {
      await endpoints.addTransaction(data);
      
      // Refresh transactions from backend
      const txRes = await endpoints.getTransactions();
      const updatedTxn = txRes.data.transactions || [];
      setAllTransactions(updatedTxn);
      
      toast.success('✅ Transaction saved!');
    } catch (e) {
      console.error('❌ Failed to add transaction:', e);
      toast.error('Failed to save transaction');
      throw e;
    }
  };

  // ✅ Edit transaction
  const editTransaction = async (id: string, data: Omit<Transaction, 'id' | 'user_id'>) => {
    try {
      await endpoints.updateTransaction(id, data);
      
      // Refresh transactions
      const txRes = await endpoints.getTransactions();
      setAllTransactions(txRes.data.transactions || []);
      
      toast.success('✅ Transaction updated!');
    } catch (e) {
      console.error('❌ Failed to update transaction:', e);
      toast.error('Failed to update');
    }
  };

  // ✅ Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      await endpoints.deleteTransaction(id);
      
      // Refresh transactions
      const txRes = await endpoints.getTransactions();
      setAllTransactions(txRes.data.transactions || []);
      
      toast.success('✅ Transaction deleted!');
    } catch (e) {
      console.error('❌ Failed to delete:', e);
      toast.error('Failed to delete');
    }
  };

  // ✅ Update budget settings
  const updateBudgetSettings = async (salary: number, fixedCosts: any, config?: string) => {
    try {
      await endpoints.updateBudgetSettings({ salary, fixed_costs: fixedCosts, config });
      setBudget(prev => ({ ...prev, salary, fixedCosts, config }));
      toast.success('✅ Budget updated!');
    } catch {
      toast.error('Failed to update budget');
    }
  };

  // ✅ Create account
  const createAccount = async (data: Omit<Account, 'id'>) => {
    try {
      // Save to backend
      await endpoints.createAccount(data);
      
      // Refresh accounts from backend
      const accRes = await endpoints.getAccounts();
      const updatedAccounts = accRes.data.accounts || [];
      setBudget(prev => ({...prev, accounts: updatedAccounts}));
      
      // Auto-set to new account
      if (updatedAccounts.length > 0) {
        setActiveAccount(updatedAccounts[updatedAccounts.length - 1].name);
      }
      
      toast.success(`✅ Account "${data.name}" created!`);
      
    } catch (e) { 
      console.error('❌ Failed to create account:', e);
      toast.error('Failed to create account'); 
    }
  };

  // ✅ Delete account
  const deleteAccount = async (id: string) => {
    try {
      await endpoints.deleteAccount(id);
      
      // Refresh accounts
      const accRes = await endpoints.getAccounts();
      const updatedAccounts = accRes.data.accounts || [];
      setBudget(prev => ({...prev, accounts: updatedAccounts}));
      
      if (activeAccount === id) setActiveAccount('all');
      toast.success('✅ Account deleted!');
    } catch (e) { 
      console.error('❌ Failed to delete account:', e);
      toast.error('Failed to delete account'); 
    }
  };

  // ✅ Add goal
  const addGoal = async (data: Omit<Goal, 'id'>) => {
    try {
      const res = await endpoints.createGoal(data);
      const newGoal = res.data;
      setBudget(prev => ({ 
        ...prev, 
        goals: [...prev.goals, newGoal]
      }));
      toast.success('✅ Goal added!');
    } catch (e) { 
      console.error('❌ Failed to add goal:', e);
      toast.error('Failed to add goal'); 
    }
  };

  // ✅ Delete goal
  const deleteGoal = async (id: string) => {
    try {
      await endpoints.deleteGoal(id);
      setBudget(prev => ({ 
        ...prev, 
        goals: prev.goals.filter(g => g.id !== id)
      }));
      toast.success('✅ Goal deleted!');
    } catch (e) {
      console.error('❌ Failed to delete goal:', e);
      toast.error('Failed to delete goal');
    }
  };

  // ✅ Add habit
  const addHabit = async (name: string) => {
    try {
      const res = await endpoints.createHabit(name);
      const newHabit = res.data;
      setHabits(prev => [...prev, newHabit]);
      toast.success('✅ Habit added!');
    } catch { 
      toast.error('Failed to add habit'); 
    }
  };

  // ✅ Toggle habit check
  const toggleHabitCheck = async (id: string, date: string, completed: boolean) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    let newDates = [...habit.completed_dates];
    if (completed) { 
      if (!newDates.includes(date)) newDates.push(date); 
    } else { 
      newDates = newDates.filter(d => d !== date); 
    }
    
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completed_dates: newDates } : h));
    
    try { 
      await endpoints.updateHabit(id, { completed_dates: newDates }); 
    } catch { 
      toast.error("Failed to update habit");
    }
  };

  // ✅ Delete habit
  const deleteHabit = async (id: string) => {
    try {
      await endpoints.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
      toast.success('✅ Habit deleted!');
    } catch { 
      toast.error('Failed to delete habit'); 
    }
  };

  // ✅ Seed habits
  const seedHabits = async () => {
    try {
      await endpoints.seedHabits();
      const res = await endpoints.getHabits();
      setHabits(res.data);
    } catch (e) { 
      console.error('Failed to seed habits', e); 
    }
  };

  return (
    <AppContext.Provider value={{
      user, setUser, isLoading, login, signup, logout, updateProfile, changePassword,
      transactions, allTransactions, addTransaction, editTransaction, deleteTransaction,
      budget, setBudget, updateBudgetSettings, activeAccount, setActiveAccount,
      createAccount, deleteAccount, addGoal, deleteGoal, chatMessages, setChatMessages,
      habits, addHabit, toggleHabitCheck, deleteHabit, seedHabits,
      language, setLanguage,
      hasShownAccountSelection, setHasShownAccountSelection
    }}>
      {children}
    </AppContext.Provider>
  );
};
