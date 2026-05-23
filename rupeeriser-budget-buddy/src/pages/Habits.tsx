import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Habits() {
  const navigate = useNavigate();
  const { habits, addHabit, toggleHabitCheck, deleteHabit, seedHabits } = useApp();
  const [newHabitName, setNewHabitName] = useState('');
  // No auto-seeding — users add their own habits

  /* ---------------- PAGINATION (FIXED TO 6) ---------------- */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // ✅ Fixed to 6 items per page
  const totalPages = Math.ceil(habits.length / itemsPerPage) || 1;
  
  const currentHabits = habits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper to fill empty space to maintain fixed height
  const emptyRows = itemsPerPage - currentHabits.length;

  /* ---------------- DELETE ---------------- */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---------------- WEEK LOGIC ---------------- */
  const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDates = getWeekDates();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleAdd = async () => {
    if (!newHabitName.trim()) return;
    await addHabit(newHabitName);
    setNewHabitName('');
    // Go to last page to see new item
    const newTotal = Math.ceil((habits.length + 1) / itemsPerPage);
    if(newTotal > currentPage) setCurrentPage(newTotal);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteHabit(deleteId);
      setDeleteId(null);
      // Adjust page if empty
      const remaining = habits.length - 1;
      const newTotal = Math.ceil(remaining / itemsPerPage) || 1;
      if (currentPage > newTotal) setCurrentPage(newTotal);
    }
  };

  /* ---------------- GRAPH ---------------- */
  const getGraphData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // ✅ FIXED: Check if habit.completed_dates exists and is an array before using .includes()
      const count = habits.filter((h) =>
        Array.isArray(h.completed_dates) && h.completed_dates.includes(dateStr)
      ).length;
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      });
    }
    return data;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-32 animate-fade-in px-4 pt-4 h-full flex flex-col">

      {/* HEADER */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Weekly Habits
            </h1>
            <p className="text-muted-foreground text-sm">
              Consistency is key.
            </p>
          </div>
        </div>

        {/* ADD HABIT */}
        <div className="flex gap-2 w-full md:max-w-md">
          <Input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="New habit..."
            className="input-glass bg-card/50 text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* LIST CONTAINER */}
        <div className="flex-1 bg-card border rounded-3xl p-4 flex flex-col">
          
          {/* ✅ DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 w-1/3 text-muted-foreground font-medium">Habit</th>
                  {weekDays.map((day, i) => {
                    const isToday = new Date().toDateString() === weekDates[i].toDateString();
                    return (
                      <th key={day} className={cn('p-2 text-center text-sm font-medium', isToday ? 'text-blue-600 font-bold' : 'text-muted-foreground')}>
                        <div className="flex flex-col items-center">
                          <span>{day}</span>
                          <span className="text-xs opacity-70">{weekDates[i].getDate()}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {currentHabits.map((habit) => (
                  <tr key={habit.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors h-14">
                    <td className="p-3 font-medium truncate text-foreground">{habit.name}</td>
                    {weekDates.map((d) => {
                      const dateStr = d.toISOString().split('T')[0];
                      // ✅ FIXED: Check if habit.completed_dates exists before calling .includes()
                      const done = Array.isArray(habit.completed_dates) && habit.completed_dates.includes(dateStr);
                      return (
                        <td key={dateStr} className="p-2 text-center">
                          <button onClick={() => toggleHabitCheck(habit.id, dateStr, !done)} className={cn('w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all', done ? 'bg-blue-600 text-white' : 'bg-secondary hover:bg-secondary/80')}>
                            {done && <Check className="w-5 h-5" />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <button onClick={() => setDeleteId(habit.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {/* Empty Rows for Fixed Height */}
                {Array.from({ length: emptyRows }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-14 border-b border-border/30 last:border-0"><td colSpan={9}></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ✅ MOBILE LIST VIEW (FIXED HEIGHT) */}
          <div className="md:hidden flex flex-col h-full">
             {/* Sticky Header Row */}
             <div className="grid grid-cols-9 gap-0.5 text-[10px] text-muted-foreground text-center bg-card z-10 py-3 border-b border-border">
                <div className="col-span-2 text-left pl-2 font-bold text-foreground">Habit</div>
                {weekDates.map((dateObj, i) => {
                    const isToday = new Date().toDateString() === dateObj.toDateString();
                    return (
                        <div key={i} className={cn("flex flex-col", isToday ? "text-blue-600 font-bold" : "text-muted-foreground")}>
                            <span>{weekDays[i].charAt(0)}</span>
                            <span>{dateObj.getDate()}</span>
                        </div>
                    )
                })}
             </div>

             {/* Items List */}
             <div className="flex-1">
                 {currentHabits.map((habit) => (
                    <div key={habit.id} className="grid grid-cols-9 gap-0.5 items-center border-b border-border/40 min-h-[56px] py-1">
                        <div className="col-span-2 text-[11px] font-medium pr-1 flex items-center gap-1 text-foreground pl-2">
                            <span className="leading-tight line-clamp-2 flex-1">{habit.name}</span>
                            <button onClick={() => setDeleteId(habit.id)} className="text-muted-foreground shrink-0 hover:text-red-500"><Trash2 size={11}/></button>
                        </div>
                        {weekDates.map((dateObj) => {
                            const dateStr = dateObj.toISOString().split('T')[0];
                            // ✅ FIXED: Check if habit.completed_dates exists before calling .includes()
                            const isDone = Array.isArray(habit.completed_dates) && habit.completed_dates.includes(dateStr);
                            return (
                                <div key={dateStr} className="flex justify-center">
                                    <button onClick={() => toggleHabitCheck(habit.id, dateStr, !isDone)} className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all border", isDone ? "bg-blue-600 text-white border-blue-600" : "border-border hover:bg-secondary")}>
                                        {isDone && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                 ))}
                 
                 {/* Empty Rows (Fill space) */}
                 {Array.from({ length: emptyRows }).map((_, i) => (
                    <div key={`empty-mob-${i}`} className="h-14 border-b border-border/20 w-full" />
                 ))}

                 {habits.length === 0 && (
                    <div className="flex items-center justify-center text-sm text-muted-foreground py-20">
                        No habits found. Add one above!
                    </div>
                 )}
             </div>
          </div>

          {/* PAGINATION */}
          <div className="mt-auto pt-4 flex justify-between items-center border-t border-border/50 shrink-0">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 border-border" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 border-border" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* GRAPH */}
        <div className="lg:w-[350px] bg-card border rounded-3xl p-6 shadow-sm shrink-0">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-lg text-foreground">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Trends
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={getGraphData()}>
              <defs>
                  <linearGradient id="habitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{fontSize: 10, fill: '#888'}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)' }} itemStyle={{ color: 'var(--foreground)' }} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fill="url(#habitColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete Habit?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
