import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DerivedTask, Metrics, Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
  withDerived,
  sortTasks as sortDerived,
} from '@/utils/logic';
// Local storage removed per request; keep everything in memory
import { generateSalesTasks } from '@/utils/seed';

// Central hook to manage tasks, fixes bugs related to duplicates, undo, sorting and ROI

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  lastDeleted: Task | null;
  addTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  clearLastDeleted: () => void;
}

const INITIAL_METRICS: Metrics = {
  totalRevenue: 0,
  totalTimeTaken: 0,
  timeEfficiencyPct: 0,
  revenuePerHour: 0,
  averageROI: 0,
  performanceGrade: 'Needs Improvement',
};

export function useTasks(): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const fetchedRef = useRef(false);

  // Normalize incoming tasks and ensure unique IDs
  function normalizeTasks(input: any[]): Task[] {
    const now = Date.now();
    const seenIds = new Set<string>();
    return (Array.isArray(input) ? input : []).map((t, idx) => {
      let id = t.id;

      // Generate new ID if missing or duplicate
      if (!id || seenIds.has(id)){
        id=crypto.randomUUID();
      }
      seenIds.add(id);

      const created = t.createdAt ? new Date(t.createdAt) : new Date(now - (idx + 1) * 24 * 3600 * 1000);
      const completed = t.completedAt || (t.status === 'Done' ? new Date(created.getTime() + 24 * 3600 * 1000).toISOString() : undefined);
      return {
        id,
        title: t.title || 'Untitled Task',
        revenue: Number(t.revenue) || 0,
        timeTaken: Number(t.timeTaken) > 0 ? Number(t.timeTaken) : 1,
        priority: t.priority || 'Low',
        status: t.status || 'Todo',
        notes: t.notes,
        createdAt: created.toISOString(),
        completedAt: completed,
      } as Task;
    });
  }

  // Load tasks once when app starts
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/tasks.json');
        if (!res.ok) throw new Error(`Failed to load tasks.json (${res.status})`);
        const data = (await res.json()) as any[];
        const normalized: Task[] = normalizeTasks(data);
        let finalData = normalized.length > 0 ? normalized : generateSalesTasks(50);
        if (isMounted) setTasks(finalData);
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? 'Failed to load tasks');
      } finally {
        if (isMounted) {
          setLoading(false);
          fetchedRef.current = true;
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute derived values and apply stable sorting
  const derivedSorted = useMemo<DerivedTask[]>(() => {
    const withRoi = tasks.map(withDerived);
    return sortDerived(withRoi);
  }, [tasks]);

  // Calculate dashboard metrics safely
  const metrics = useMemo<Metrics>(() => {
    if (tasks.length === 0) return INITIAL_METRICS;
    const totalRevenue = computeTotalRevenue(tasks);
    const totalTimeTaken = tasks.reduce((s, t) => s + t.timeTaken, 0);
    const timeEfficiencyPct = computeTimeEfficiency(tasks);
    const revenuePerHour = computeRevenuePerHour(tasks);
    const averageROI = computeAverageROI(tasks);
    const performanceGrade = computePerformanceGrade(averageROI);
    return { totalRevenue, totalTimeTaken, timeEfficiencyPct, revenuePerHour, averageROI, performanceGrade };
  }, [tasks]);

  // Add new task with safe defaults
  const addTask = useCallback((task: Omit<Task, 'id'> & { id?: string }) => {
    setTasks(prev => {
      const id = task.id ?? crypto.randomUUID();
      const timeTaken = task.timeTaken <= 0 ? 1 : task.timeTaken; // auto-correct
      const createdAt = new Date().toISOString();
      const status = task.status;
      const completedAt = status === 'Done' ? createdAt : undefined;
      return [...prev, { ...task, id, timeTaken, createdAt, completedAt }];
    });
  }, []);

  // Update task and auto-handle completion time
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch } as Task;
        if (t.status !== 'Done' && merged.status === 'Done' && !merged.completedAt) {
          merged.completedAt = new Date().toISOString();
        }
        return merged;
      });
      // Ensure timeTaken remains > 0
      return next.map(t => (t.id === id && (patch.timeTaken ?? t.timeTaken) <= 0 ? { ...t, timeTaken: 1 } : t));
    });
  }, []);

  // Delete task and store it for undo
  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) || null;
      setLastDeleted(target);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  // Restore last deleted task
  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks(prev => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  // Clear undo state when snackbar closes
  const clearLastDeleted = () =>{
    setLastDeleted(null)
  } 

  return { tasks, loading, error, derivedSorted, metrics, lastDeleted, addTask, updateTask, deleteTask, undoDelete, clearLastDeleted };
}


