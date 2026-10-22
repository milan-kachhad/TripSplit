import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CreateTripModal from '../components/CreateTripModal';
import ThemeToggle from '../components/ThemeToggle';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({ expensesCount: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch only this authenticated user's dashboard data from backend API
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      if (res.data) {
        setTrips(res.data.trips || []);
        setStats({
          expensesCount: res.data.expensesCount || 0,
          totalSpent: res.data.totalSpent || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const username = user?.username || 'Traveler';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 sm:px-10 py-4 flex items-center justify-between shadow-xs sticky top-0 z-20 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-xs">
            TS
          </div>
          <div>
            <span className="font-extrabold text-xl text-gray-900 dark:text-white tracking-tight">TripSplit</span>
            <span className="text-xs text-gray-400 dark:text-slate-400 ml-2 hidden sm:inline">Shared Expense Manager</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />

          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-gray-800 dark:text-slate-200">{username}</div>
          </div>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 border border-gray-300 dark:border-slate-700 rounded-md text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

    
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Welcome & Action Banner */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors duration-200">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Main Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
              Welcome, {username} 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-xl">
              Track your shared trips, calculate fair split balances, and settle up payments with travel companions.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-bold transition shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>+ Create New Trip</span>
          </button>
        </div>

        {/* 3 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
            <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
              Your Trips
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
              {trips.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Active trip workspaces in your account</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
            <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
              Total Expenses Recorded
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.expensesCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Across all your trips</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
            <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
              Total Spending
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              ₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Your recorded total expenses</div>
          </div>
        </div>

        {/* Trips Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Trips</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Only you have access to your personal trips</p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition cursor-pointer"
            >
              + New Trip
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Loading your trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-200">No trips yet</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-4">
                You haven't created any trips yet. Get started by creating your first trip space!
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold cursor-pointer"
              >
                + Create Your First Trip
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => {
                const tripId = trip._id || trip.id;
                const memberCount = trip.members ? trip.members.length : (trip.memberCount || 1);
                const isSettled = Boolean(trip.isSettled || trip.status === 'settled');

                return (
                  <div
                    key={tripId}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{trip.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 shrink-0">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {trip.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
                      {isSettled ? (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          Settled
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                          Active Trip
                        </span>
                      )}

                      <Link
                        to={`/trip/${tripId}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Open Trip</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <CreateTripModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTripCreated={fetchDashboardData}
      />
    </div>
  );
}
