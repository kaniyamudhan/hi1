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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// ✅ Get user-specific key for localStorage
const getUserStorageKey = (userId: string, key: string) => `user_${userId}_${key}`;

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

  // ✅ Persist language preference
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

  // ✅ Fetch data from backend + localStorage fallback
  const fetchData = useCallback(async (userId: string) => {
    try {
      console.log('🔄 Fetching data from backend...');
      
      const [txRes, accRes] = await Promise.all([
        endpoints.getTransactions(),
        endpoints.getAccounts(),
      ]);
      
      // ✅ Process transactions
      const txData = Array.isArray(txRes.data) ? txRes.data : [];
      const formattedTx = txData.map((t: any) => ({...t, id: t.id || t._id}));
      
      // ✅ Process accounts
      let accountsData: Account[] = [];
      if (Array.isArray(accRes.data)) {
        accountsData = accRes.data;
      } else if (accRes.data?.accounts && Array.isArray(accRes.data.accounts)) {
        accountsData = accRes.data.accounts;
      }
      
      console.log('📥 Backend Transactions:', formattedTx);
      console.log('📥 Backend Accounts:', accountsData);
      
      // ✅ If backend returns data, use it and save to localStorage
      if (formattedTx.length > 0 || accountsData.length > 0) {
        setAllTransactions(formattedTx);
        setBudget(prev => ({...prev, accounts: accountsData}));
        localStorage.setItem(getUserStorageKey(userId, 'transactions'), JSON.stringify(formattedTx));
        localStorage.setItem(getUserStorageKey(userId, 'accounts'), JSON.stringify(accountsData));
      } else {
        // ✅ Backend returned nothing, load from localStorage
        console.log('⚠️ Backend returned empty, loading from localStorage...');
        const storedTx = localStorage.getItem(getUserStorageKey(userId, 'transactions'));
        const storedAcc = localStorage.getItem(getUserStorageKey(userId, 'accounts'));
        
        if (storedTx) setAllTransactions(JSON.parse(storedTx));
        if (storedAcc) setBudget(prev => ({...prev, accounts: JSON.parse(storedAcc)}));
      }
      
      // ✅ Auto-set active account to first account
      const accountsToUse = accountsData.length > 0 ? accountsData : (localStorage.getItem(getUserStorageKey(userId, 'accounts')) ? JSON.parse(localStorage.getItem(getUserStorageKey(userId, 'accounts'))!) : []);
      if (accountsToUse.length > 0 && activeAccount === 'all') {
        const preferredAccount = accountsToUse.find((a: Account) => a.type === 'upi') || accountsToUse[0];
        setActiveAccount(preferredAccount.name);
        console.log('🎯 Auto-set active account to:', preferredAccount.name);
      }
      
    } catch (error) {
      console.error("❌ Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount]);

  // ✅ Login
  const login = (token: string, name: string) => {
    console.log('🔐 Logging in user:', name);
    localStorage.setItem('token', token);
    localStorage.setItem('user_name', name);
    
    endpoints.getMe()
      .then(res => {
        console.log('✅ Got user data:', res.data);
        setUser(res.data);
        fetchData(res.data._id || res.data.id);
      })
      .catch(err => {
        console.error('❌ Failed to get user data:', err);
      });
  };

  // ✅ Signup
  const signup = async (data: { name: string; email: string; password: string }) => {
    const res = await endpoints.signup(data);
    localStorage.setItem('token', res.data.access_token);
    const userData = { id: '', name: res.data.user_name, email: data.email };
    setUser(userData as User);
    await fetchData(userData.id);
  };

  // ✅ Logout
  const logout = () => {
    console.log('🚪 Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    
    setUser(null);
    setAllTransactions([]);
    setBudget(prev => ({...prev, accounts: []}));
    setActiveAccount('all');
    setHabits([]);
    queryClient.clear();
  };

  // ✅ Update profile
  const updateProfile = async (data: Partial<User>) => {
    try {
      await endpoints.updateProfile(data); 
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.error("Profile update error", err);
      throw err;
    }
  };

  // ✅ Change password
  const changePassword = async (data: { current_password: string; new_password: string; plain_text_password?: string }) => {
    try {
      await endpoints.changePassword(data);
    } catch (err) {
      console.error("Password change error", err);
      throw err;
    }
  };

  // ✅ Add transaction - SAVE TO BOTH BACKEND AND LOCALSTORAGE
  const addTransaction = async (data: Omit<Transaction, 'id' | 'user_id'>) => {
    console.log('📨 Adding transaction:', data);
    
    const newTx: Transaction = {
      ...data,
      id: `txn_${Date.now()}`,
      user_id: user?.id || 'local'
    };
    
    // ✅ Optimistic update
    setAllTransactions(prev => [newTx, ...prev]);
    
    try {
      // Try to save to backend (might return "Coming soon")
      await endpoints.addTransaction(data);
    } catch (e) {
      console.error('❌ Backend failed:', e);
    }
    
    // ✅ Always save to localStorage
    setAllTransactions(prev => {
      localStorage.setItem(getUserStorageKey(user?.id || 'local', 'transactions'), JSON.stringify(prev));
      return prev;
    });
    
    toast.success('✅ Transaction saved!');
  };

  // ✅ Edit transaction
  const editTransaction = async (id: string, data: Omit<Transaction, 'id' | 'user_id'>) => {
    try {
      await endpoints.updateTransaction(id, data);
      
      setAllTransactions(prev => {
        const updated = prev.map(tx => tx.id === id ? {...tx, ...data} : tx);
        localStorage.setItem(getUserStorageKey(user?.id || 'local', 'transactions'), JSON.stringify(updated));
        return updated;
      });
      
      toast.success('✅ Transaction updated!');
    } catch (e) {
      console.error('❌ Failed to update transaction:', e);
      toast.error('Failed to update');
    }
  };

  // ✅ Delete transaction
  const deleteTransaction = async (id: string) => {
    setAllTransactions(prev => {
      const filtered = prev.filter(tx => tx.id !== id);
      localStorage.setItem(getUserStorageKey(user?.id || 'local', 'transactions'), JSON.stringify(filtered));
      return filtered;
    });
    
    try {
      await endpoints.deleteTransaction(id);
      toast.success('✅ Transaction deleted!');
    } catch (e) {
      console.error('❌ Failed to delete:', e);
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

  // ✅ Create account - SAVE TO BOTH BACKEND AND LOCALSTORAGE
  const createAccount = async (data: Omit<Account, 'id'>) => {
    try {
      console.log('🏦 Creating account:', data);
      
      const newAccount: Account = {
        id: `acc_${Date.now()}`,
        name: data.name,
        type: data.type,
        balance: data.balance || 0,
      };
      
      // ✅ Optimistic update
      setBudget(prev => ({
        ...prev,
        accounts: [...prev.accounts, newAccount]
      }));
      
      setActiveAccount(newAccount.name);
      
      try {
        // Try backend (might return "Coming soon")
        await endpoints.createAccount(data);
      } catch (e) {
        console.error('❌ Backend failed:', e);
      }
      
      // ✅ Always save to localStorage
      setBudget(prev => {
        localStorage.setItem(getUserStorageKey(user?.id || 'local', 'accounts'), JSON.stringify(prev.accounts));
        return prev;
      });
      
      toast.success(`✅ Account "${newAccount.name}" created!`);
      
    } catch (e) { 
      console.error('❌ Failed to create account:', e);
      toast.error('Failed to create account'); 
    }
  };

  // ✅ Delete account
  const deleteAccount = async (id: string) => {
    try {
      await endpoints.deleteAccount(id);
      
      setBudget(prev => {
        const filtered = prev.accounts.filter(acc => acc.id !== id);
        localStorage.setItem(getUserStorageKey(user?.id || 'local', 'accounts'), JSON.stringify(filtered));
        return {...prev, accounts: filtered};
      });
      
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
      language, setLanguage
    }}>
      {children}
    </AppContext.Provider>
  );
};