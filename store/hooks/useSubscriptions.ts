"use client"

import {  useSelector } from 'react-redux';
import {
  fetchCurrentMonthSubscriptions,
  fetchSubscriptionStats,
  fetchUserSubscriptions
} from '../features/subscriptions/subscriptionSlice';
import { useEffect } from 'react';
import { useAppDispatch } from './hook';

export const useCurrentMonthSubscriptions = () => {
  const dispatch = useAppDispatch();
  const {
    currentMonthSubscriptions,
    loading,
    error,
    lastFetched
  } = useSelector((state: any) => state?.subscriptions);

  useEffect(() => {
    if (!currentMonthSubscriptions.length || 
        (lastFetched.currentMonth && Date.now() - lastFetched.currentMonth > 300000)) {
      dispatch(fetchCurrentMonthSubscriptions());
    }
  }, [dispatch, currentMonthSubscriptions.length, lastFetched.currentMonth]);

  return { data: currentMonthSubscriptions, loading, error };
};

export const useSubscriptionStats = () => {
  const dispatch = useAppDispatch();
  const {
    subscriptionStats,
    loading,
    error,
    lastFetched
  } = useSelector((state: any) => state.subscriptions);

  useEffect(() => {
    if (!Object.keys(subscriptionStats).length || 
        (lastFetched.stats && Date.now() - lastFetched.stats > 300000)) {
      dispatch(fetchSubscriptionStats());
    }
  }, [dispatch, subscriptionStats, lastFetched.stats]);

  return { data: subscriptionStats, loading, error };
};

export const useUserSubscriptions = (userId: string) => {
  const dispatch = useAppDispatch();
  const {
    userSubscriptions,
    loading,
    error,
    lastFetched
  } = useSelector((state: any) => state.subscriptions);

  useEffect(() => {
    if (!userSubscriptions[userId] || 
        (lastFetched.userSubs && Date.now() - lastFetched.userSubs > 300000)) {
      dispatch(fetchUserSubscriptions(userId));
    }
  }, [dispatch, userId, userSubscriptions, lastFetched.userSubs]);

  return { 
    data: userId ? userSubscriptions[userId] || [] : [], 
    loading, 
    error 
  };
};