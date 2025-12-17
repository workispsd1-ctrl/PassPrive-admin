// hooks/useInvoices.ts
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { fetchInvoices } from '../features/invoices/invoiceSlice';
import { useAppDispatch } from './hook';

export const useInvoices = () => {
  const dispatch = useAppDispatch();
  const { invoices, loading, error } = useSelector((state:any) => state.invoices);

  useEffect(() => {
    const loadInvoices = async () => {
      if (invoices.length === 0 && !loading) {
        try {
          await dispatch(fetchInvoices()).unwrap();
        } catch (error) {
          console.error('Failed to load invoices:', error);
        }
      }
    };

    loadInvoices();
  }, [dispatch, invoices.length, loading]);

  return { invoices, loading, error };
};