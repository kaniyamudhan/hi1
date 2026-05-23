import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  
  // ✅ Updated Profile Signature
  updateProfile: (data: Partial<User>) => Promise<void>;

  // ✅ Updated Password Signature
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

  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang === 'EN' || savedLang === 'TA' || savedLang === 'HI') {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const transactions = useMemo(() => {
    if (activeAccount === 'all') return allTransactions;
    // ✅ FIXED: Check if t.account exists before calling toLowerCase()
    return allTransactions.filter(t => t.account && t.account.toLowerCase() === activeAccount.toLowerCase());
  }, [allTransactions, activeAccount]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      endpoints.getMe().then((res) => {
        setUser(res.data);
        fetchData();
      }).catch(() => {
        logout();
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, accRes, goalRes, budgetRes, habitRes] = await Promise.all([
        endpoints.getTransactions(),
        endpoints.getAccounts(),
        endpoints.getGoals(),
        endpoints.getBudgetSettings(),
        endpoints.getHabits(),
      ]);
      
      const txData = Array.isArray(txRes.data) ? txRes.data : [];
      const formattedTx = txData.map((t: any) => ({...t, id: t.id || t._id}));
      setAllTransactions(formattedTx);

      // ✅ FIXED: Ensure accounts and goals are always arrays
      const accountsData = Array.isArray(accRes.data) ? accRes.data : [];
      const goalsData = Array.isArray(goalRes.data) ? goalRes.data : [];

      setBudget(prev => ({
        ...prev,
        salary: budgetRes.data.salary || 0,
        fixedCosts: budgetRes.data.fixed_costs || { rent: 0, travel: 0, phone: 0, subscriptions: 0 },
        config: budgetRes.data.config || "",
        accounts: accountsData,
        goals: goalsData,
      }));
      
      setHabits(Array.isArray(habitRes.data) ? habitRes.data : []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (token: string, name: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user_name', name);
    endpoints.getMe().then(res => {
      setUser(res.data);
      fetchData();
    });
  };

  const signup = async (data: { name: string; email: string; password: string }) => {
    const res = await endpoints.signup(data);
    localStorage.setItem('token', res.data.access_token);
    setUser({ id: '', name: res.data.user_name, email: data.email });
    await fetchData();
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAllTransactions([]);
    setHabits([]);
    setBudget({
        salary: 0,
        fixedCosts: { rent: 0, travel: 0, phone: 0, subscriptions: 0 },
        config: "",
        goals: [],
        accounts: [],
    });
    setActiveAccount('all');
    queryClient.clear();
  };

  // ✅ FIXED: Update Profile (Full Object Support)
  const updateProfile = async (data: Partial<User>) => {
    try {
      await endpoints.updateProfile(data); 
      // Merge updates into local user state immediately
      setUser(prev => prev ? { ...prev, ...data } : null);
      // Success toast is handled in component
    } catch (err) {
      console.error("Profile update error", err);
      throw err; // Re-throw so component can show error
    }
  };

  // ✅ FIXED: Change Password (Supports Plain Text Field)
  const changePassword = async (data: { current_password: string; new_password: string; plain_text_password?: string }) => {
    try {
      await endpoints.changePassword(data);
      // Success toast is handled in component
    } catch (err) {
      console.error("Password change error", err);
      throw err; // Re-throw so component can show specific backend error
    }
  };

const addTransaction = async (data: Omit<Transaction, 'id' | 'user_id'>) => {
  console.log('📨 Adding transaction with data:', data);
  
  const tempId = Date.now().toString();
  const optimisticTx = { ...data, id: tempId, user_id: 'temp' } as Transaction;
  setAllTransactions(prev => [optimisticTx, ...prev]);
  try {
    const res = await endpoints.addTransaction(data);
    const newTx = res.data;
    
    console.log('✅ Transaction added:', newTx);
    
    setAllTransactions(prev => prev.map(tx => tx.id === tempId ? { ...newTx, id: newTx.id || newTx._id } : tx));
    toast.success('Transaction added');
  } catch (e) {
    console.error('❌ Failed to add transaction:', e);
    setAllTransactions(prev => prev.filter(tx => tx.id !== tempId));
    toast.error('Failed to add transaction');
  }
};

  const editTransaction = async (id: string, data: Omit<Transaction, 'id' | 'user_id'>) => {
    try {
      const res = await endpoints.updateTransaction(id, data);
      const updated = res.data;
      setAllTransactions(prev => prev.map(tx => tx.id === id ? updated : tx));
      toast.success('Transaction updated');
    } catch (e) {
      toast.error('Failed to update transaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    const prev = allTransactions;
    setAllTransactions(curr => curr.filter(tx => tx.id !== id));
    try {
      await endpoints.deleteTransaction(id);
      toast.success('Transaction deleted');
    } catch {
      setAllTransactions(prev);
      toast.error('Failed to delete transaction');
    }
  };

  const updateBudgetSettings = async (salary: number, fixedCosts: any, config?: string) => {
    try {
      await endpoints.updateBudgetSettings({ salary, fixed_costs: fixedCosts, config });
      setBudget(prev => ({ ...prev, salary, fixedCosts, config }));
    } catch {
       toast.error('Failed to update budget settings');
       throw new Error('Update failed');
    }
  };

  const createAccount = async (data: Omit<Account, 'id'>) => {
    try {
      const res = await endpoints.createAccount(data);
      const newAcc = res.data;
      // ✅ FIXED: Ensure accounts is always an array before spreading
      setBudget(prev => ({ 
        ...prev, 
        accounts: Array.isArray(prev.accounts) ? [...prev.accounts, newAcc] : [newAcc]
      }));
      toast.success('Account created');
    } catch (e) { toast.error('Failed to create account'); }
  };

  const deleteAccount = async (id: string) => {
    try {
      await endpoints.deleteAccount(id);
      // ✅ FIXED: Ensure accounts is always an array before filtering
      setBudget(prev => ({ 
        ...prev, 
        accounts: Array.isArray(prev.accounts) ? prev.accounts.filter(acc => acc.id !== id) : []
      }));
      if (activeAccount === id) setActiveAccount('all');
      toast.success('Account deleted');
    } catch (e) { toast.error('Failed to delete account'); }
  };

  const addGoal = async (data: Omit<Goal, 'id'>) => {
    try {
      const res = await endpoints.createGoal(data);
      const newGoal = res.data;
      // ✅ FIXED: Ensure goals is always an array before spreading
      setBudget(prev => ({ 
        ...prev, 
        goals: Array.isArray(prev.goals) ? [...prev.goals, newGoal] : [newGoal]
      }));
      toast.success('Goal added');
    } catch (e) { toast.error('Failed to add goal'); }
  };

  const deleteGoal = async (id: string) => {
    try {
      await endpoints.deleteGoal(id);
      // ✅ FIXED: Ensure goals is always an array before filtering
      setBudget(prev => ({ 
        ...prev, 
        goals: Array.isArray(prev.goals) ? prev.goals.filter(g => g.id !== id) : []
      }));
      toast.success('Goal deleted');
    } catch (e) { toast.error('Failed to delete goal'); }
  };

  const addHabit = async (name: string) => {
    try {
      const res = await endpoints.createHabit(name);
      const newHabit = res.data;
      setHabits(prev => [...prev, newHabit]);
      toast.success('Habit added!');
    } catch { toast.error('Failed to add habit'); }
  };

  const toggleHabitCheck = async (id: string, date: string, completed: boolean) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    let newDates = [...habit.completed_dates];
    if (completed) { if (!newDates.includes(date)) newDates.push(date); } 
    else { newDates = newDates.filter(d => d !== date); }
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completed_dates: newDates } : h));
    try { await endpoints.updateHabit(id, { completed_dates: newDates }); } 
    catch { toast.error("Failed to update habit"); const res = await endpoints.getHabits(); setHabits(res.data); }
  };

  const deleteHabit = async (id: string) => {
    try {
      await endpoints.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
      toast.success('Habit deleted!');
    } catch { toast.error('Failed to delete habit'); }
  };

  const seedHabits = async () => {
    try {
      await endpoints.seedHabits();
      const res = await endpoints.getHabits();
      setHabits(res.data);
    } catch (e) { console.error('Failed to seed habits', e); }
  };

  return (
    <AppContext.Provider value={{
      user, setUser, isLoading, login, signup, logout, updateProfile, changePassword,
      transactions, allTransactions, addTransaction, editTransaction, deleteTransaction,
      budget, setBudget, updateBudgetSettings, activeAccount, setActiveAccount,
      createAccount, deleteAccount, addGoal, deleteGoal, chatMessages, setChatMessages,
      habits, addHabit, toggleHabitCheck, deleteHabit, seedHabits,
      language, setLanguage
    }}>
      {children}
    </AppContext.Provider>
  );
};
