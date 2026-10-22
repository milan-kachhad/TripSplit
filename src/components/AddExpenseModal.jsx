/* oxlint-disable react/purity */
/* oxlint-disable react/set-state-in-effect */
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['INR', 'USD', 'EUR', 'THB', 'AED', 'GBP'];

export default function AddExpenseModal({
  isOpen,
  onClose,
  tripId,
  members = [],
  onExpenseAdded,
}) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paid_by, setPaidBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Structured member list containing { id, name }
  const memberList = useMemo(() => {
    if (members && members.length > 0) {
      return members
        .map((m) => {
          if (typeof m === 'object' && m !== null) {
            const id = m.id || m.user_id || m._id || m.userId || m.name;
            const name = m.name || m.username || m.id || 'Member';
            return {
              id: String(id),
              name: String(name),
            };
          }
          return {
            id: String(m),
            name: String(m),
          };
        })
        .filter((m) => Boolean(m.id && m.name));
    }
    const currentId = user?.id || user?._id || 'user_default';
    const currentName = user?.username || user?.name || 'You';
    return [{ id: String(currentId), name: String(currentName) }];
  }, [members, user]);

  // Default paid_by to current user or first member on open
  useEffect(() => {
    if (isOpen) {
      const currentUserId = user?.id ? String(user.id) : '';
      const currentUserName = (user?.username || user?.name || '').toLowerCase();

      const matchedMember = memberList.find((m) => {
        if (currentUserId && String(m.id) === currentUserId) return true;
        if (currentUserName && m.name.toLowerCase() === currentUserName) return true;
        return false;
      });

      const defaultPayerId = matchedMember ? matchedMember.id : (memberList[0]?.id || currentUserId || '');
      setPaidBy(defaultPayerId);
      setCurrency('INR');
      setError('');
    }
  }, [isOpen, memberList, user]);

  if (!isOpen) return null;

  const numAmount = parseFloat(originalAmount) || 0;
  const perPerson = memberList.length > 0 ? (numAmount / memberList.length).toFixed(2) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || numAmount <= 0) {
      setError('Please provide a valid description and amount.');
      return;
    }

    setLoading(true);
    setError('');

    // Ensure paid_by contains the actual selected user ID
    const payerId = paid_by || memberList[0]?.id || user?.id;

    try {
      await api.post(`/trips/${tripId}/expenses`, {
        description: description.trim(),
        original_amount: numAmount,
        amount: numAmount,
        currency,
        paid_by: payerId,
        split_members: memberList.map((m) => m.id),
      });

      setDescription('');
      setOriginalAmount('');
      setCurrency('INR');
      onExpenseAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-gray-200 dark:border-slate-800 transition-colors duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Add New Expense</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-lg leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Expense Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner, Fuel, Hotel"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Total Amount & Currency
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                placeholder="e.g. 1500"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-24 px-2.5 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-semibold text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {currency !== 'INR' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                ⚡ Will be converted to INR using live exchange rates
              </p>
            )}

            {numAmount > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                {numAmount.toLocaleString('en-IN')} {currency} split equally across{' '}
                {memberList.length} people = {perPerson} {currency} / person
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Paid By
            </label>
            <select
              value={paid_by}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {memberList.map((member) => (
                <option key={member.id} value={member.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  {member.name} {user && (String(member.id) === String(user.id) || member.name.toLowerCase() === (user.username || '').toLowerCase()) ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium cursor-pointer"
            >
              {loading ? 'Adding Expense...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
