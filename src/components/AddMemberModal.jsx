<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AddMemberModal({
  isOpen,
  onClose,
  tripId,
  existingMembers = [],
  onMemberAdded,
}) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');

  // Fetch registered users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const res = await api.get('/users');
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error('Failed to fetch existing users:', err);
      setError('Could not load users list.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUserId('');
      setError('');
    }
  }, [isOpen, fetchUsers]);

  // Check if user is already a member of this trip
  const isMember = useCallback(
    (targetUser) => {
      if (!existingMembers || existingMembers.length === 0) return false;
      const targetId = String(targetUser.id || '').toLowerCase();
      const targetUsername = String(targetUser.username || '').toLowerCase();
      const targetEmail = String(targetUser.email || '').toLowerCase();
      const targetName = String(targetUser.name || '').toLowerCase();

      return existingMembers.some((m) => {
        if (!m) return false;
        const mid = String(m.id || m.user_id || m.member_record_id || '').toLowerCase();
        const mName = String(m.name || '').toLowerCase();
        const mEmail = String(m.email || '').toLowerCase();

        return (
          (targetId && mid && targetId === mid) ||
          (targetEmail && mEmail && targetEmail === mEmail) ||
          (targetUsername && mName && targetUsername === mName) ||
          (targetName && mName && targetName === mName)
        );
      });
    },
    [existingMembers]
  );

=======
import React, { useState } from 'react';
import api from '../api/axios';

export default function AddMemberModal({ isOpen, onClose, tripId, onMemberAdded }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    if (!selectedUserId) {
      setError('Please select a user to add.');
      return;
    }

    const selectedObj = users.find((u) => String(u.id) === String(selectedUserId));
    if (!selectedObj) {
      setError('Selected user not found.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post(`/trips/${tripId}/members`, {
        userId: selectedObj.id,
        name: selectedObj.username || selectedObj.name,
        email: selectedObj.email,
      });

      setSelectedUserId('');
      if (onMemberAdded) onMemberAdded();
=======
    if (!name.trim()) return;

    setError('');
    setLoading(true);
    try {
      await api.post(`/trips/${tripId}/members`, {
        name: name.trim(),
        email: name.trim(),
      });
      setName('');
      onMemberAdded();
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-gray-200 dark:border-slate-800 transition-colors duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Add Member</h3>
<<<<<<< HEAD
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-lg leading-none cursor-pointer"
          >
=======
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-lg leading-none cursor-pointer">
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
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
<<<<<<< HEAD
              Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {loadingUsers ? 'Loading users...' : ' Select User '}
              </option>
              {users.map((u) => {
                const alreadyAdded = isMember(u);
                const isCurrent = currentUser && String(currentUser.id) === String(u.id);
                const displayName = u.username || u.name;

                return (
                  <option
                    key={u.id}
                    value={u.id}
                    disabled={alreadyAdded}
                    className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {displayName} ({u.email}){isCurrent ? ' (You)' : ''}{alreadyAdded ? ' — Already Added' : ''}
                  </option>
                );
              })}
            </select>
=======
              Member Name or Email
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Milan or milan@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
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
<<<<<<< HEAD
              disabled={loading || !selectedUserId}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
=======
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium cursor-pointer"
            >
              {loading ? 'Adding...' : 'Add'}
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
