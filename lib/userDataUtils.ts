
import {format , parseISO, isWithinInterval, subMonths, startOfMonth } from 'date-fns';

export const processSignupData = (users: any[]) => {
  if (!users?.length) return [];
  
  const monthCounts: Record<string, number> = {};
  const now = new Date();
  
  // Initialize with all months of the current year
  for (let i = 0; i < 12; i++) {
    const month = format(new Date(now.getFullYear(), i, 1), 'MMM');
    monthCounts[month] = 0;
  }
  
  // Count users per month
  users.forEach(user => {
    const month = format(parseISO(user.created_at), 'MMM');
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  
  return Object.entries(monthCounts).map(([month, count]) => ({
    month,
    users: count
  }));
};

export const processPlanData = (users: any[]) => {
  if (!users?.length) return [];
  
  const planCounts: Record<string, number> = {
    'Free': 0,
    'Basic': 0,
    'Standard': 0,
    'Premium': 0,
    'Professional': 0,
    'Enterprise': 0
  };
  
  users.forEach(user => {
    const plan = user.subscriptionPlan || 'Free';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  
  return Object.entries(planCounts)
    .filter(([_, count]) => count > 0)
    .map(([plan, count]) => ({
      plan,
      count
    }));
};

export const filterUsers = (
  users: any[], 
  searchTerm: string, 
  planFilter: string, 
  statusFilter: string
) => {
  return users?.filter((user: any) => {
    const name = user.display_name || "";
    const email = user.email || "";
    const plan = user.subscriptionPlan || "";
    const status = user.subscriptionStatus || user.status || "";

    const matchesSearch = 
      searchTerm === '' ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = 
      planFilter === 'all' || 
      (planFilter === 'free' && !plan) ||
      plan.toLowerCase() === planFilter.toLowerCase();

    const matchesStatus = 
      statusFilter === 'all' || 
      status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesPlan && matchesStatus;
  });
};



export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  canceledUsers: number;
  pastDueUsers: number;
  unpaidUsers: number;
  newThisMonth: number;
  growthRate: string;
  activePercentage: string;
  monthlyGrowth: string;
  atRisk: number;
}

export const getStats = (users: any[]): UserStats => {
  if (!users?.length) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      canceledUsers: 0,
      pastDueUsers: 0,
      unpaidUsers: 0,
      newThisMonth: 0,
      growthRate: '0%',
      activePercentage: '0%',
      monthlyGrowth: '0%',
      atRisk: 0,
    };
  }

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const lastMonthStart = subMonths(currentMonthStart, 1);
  const lastMonthEnd = subMonths(currentMonthStart, 1);

  // Calculate counts for different statuses
  const activeUsers = users.filter(user => 
    user.status?.toLowerCase() === 'active'
  ).length;

  const canceledUsers = users.filter(user => 
    user.status?.toLowerCase() === 'canceled'
  ).length;

  const pastDueUsers = users.filter(user => 
    user.status?.toLowerCase() === 'past_due'
  ).length;

  const unpaidUsers = users.filter(user => 
    user.status?.toLowerCase() === 'unpaid'
  ).length;

  // New users this month
  const newThisMonth = users.filter(user => {
    if (!user.created_at) return false;
    try {
      const created_at = parseISO(user.created_at);
      return isWithinInterval(created_at, {
        start: currentMonthStart,
        end: now
      });
    } catch {
      return false;
    }
  }).length;

  // Users created last month (for growth calculation)
  const newLastMonth = users.filter(user => {
    if (!user.created_at) return false;
    try {
      const created_at = parseISO(user.created_at);
      return isWithinInterval(created_at, {
        start: lastMonthStart,
        end: lastMonthEnd
      });
    } catch {
      return false;
    }
  }).length;

  // Calculate percentages and growth rates
  const totalUsers = users.length;
  const activePercentage = totalUsers > 0 
    ? ((activeUsers / totalUsers) * 100).toFixed(1)
    : '0';
  
  const monthlyGrowth = newLastMonth > 0
    ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)
    : newThisMonth > 0 ? '100' : '0';

  // At risk users (past due + unpaid)
  const atRisk = pastDueUsers + unpaidUsers;

  // Overall growth rate (compared to total users)
  const growthRate = totalUsers > 0
    ? ((newThisMonth / totalUsers) * 100).toFixed(1)
    : '0';

  return {
    totalUsers,
    activeUsers,
    canceledUsers,
    pastDueUsers,
    unpaidUsers,
    newThisMonth,
    growthRate: `${growthRate}%`,
    activePercentage,
    monthlyGrowth: `${monthlyGrowth}%`,
    atRisk,
  };
};