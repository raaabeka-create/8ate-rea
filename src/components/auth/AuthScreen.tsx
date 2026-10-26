import React, { useState } from 'react';
import { ShieldCheck, Phone, User, MapPin, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GHANA_REGIONS, getCitiesByRegion } from '../../data/ghanaData';
import { GhanaRegion } from '../../types';

export const AuthScreen: React.FC = () => {
  const { allUsers, switchUser, loginWithPhone, register } = useAuth();

  const [mode, setMode] = useState<'demo' | 'phone' | 'register'>('demo');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Phone sign in state
  const [phoneNumber, setPhoneNumber] = useState('+233 24 456 7890');

  // Register form state
  const [regPhone, setRegPhone] = useState('+233 24 ');
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regRegion, setRegRegion] = useState<GhanaRegion>('Ashanti');
  const [regCity, setRegCity] = useState('Kumasi Central');
  const [regBio, setRegBio] = useState('');

  const handleRegionChange = (newRegion: GhanaRegion) => {
    setRegRegion(newRegion);
    const towns = getCitiesByRegion(newRegion);
    setRegCity(towns[0] || 'Central');
  };

  const handleDemoLogin = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      await switchUser(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to switch user');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await loginWithPhone(phoneNumber);
    } catch (err: any) {
      setError(err.message || 'Phone sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await register({
        phoneNumber: regPhone,
        username: regUsername,
        displayName: regDisplayName,
        region: regRegion,
        city: regCity,
        bio: regBio,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-purple-50 via-white to-purple-50/30 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-purple-100 p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-700 text-white font-black text-3xl flex items-center justify-center mx-auto shadow-md shadow-purple-600/20 mb-3 tracking-tight">
            8
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">8ATE</h1>
          <p className="text-xs font-bold text-purple-700 uppercase tracking-widest mt-0.5">
            Made for Ghana
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Anonymous Regional Walls, Private Chats, Ghana Hubs Marketplace & Community Feeds.
          </p>
        </div>

        {/* Development Auth Disclaimer */}
        <div className="mb-5 p-2.5 rounded-xl bg-purple-50 border border-purple-200/60 flex items-start gap-2 text-xs text-purple-900">
          <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-snug">
            <span className="font-bold">Prototype authentication:</span> Accounts are stored in this browser. Phone sign-in does not send SMS or verify identity. Do not use real sensitive information.
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('demo'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'demo' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Quick Select
          </button>
          <button
            type="button"
            onClick={() => { setMode('phone'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'phone' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Phone Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Quick Demo Login Mode */}
        {mode === 'demo' && (
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Select a Ghanaian Profile</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {allUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleDemoLogin(u.id)}
                  className="p-3 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50/40 bg-gray-50/50 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-200"
                    />
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                        {u.displayName}
                        {u.verified && <span className="text-[10px] text-purple-600">✓</span>}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        @{u.username} • {u.city}
                      </div>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-purple-700 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                    <span>Enter</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Phone Login Mode */}
        {mode === 'phone' && (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Ghanaian Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-purple-600 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+233 24 XXX XXXX"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Demo phone numbers: <span className="text-purple-700 font-mono">+233 24 456 7890</span> (Kwame), <span className="text-purple-700 font-mono">+233 55 123 9988</span> (Ama)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md shadow-purple-700/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In with Phone'}
            </button>
          </form>
        )}

        {/* 3. Register New Account */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                Phone Number (Private)
              </label>
              <input
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+233 XX XXX XXXX"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5">
                  Username (@handle)
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. kofi99"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="e.g. Kofi Mensah"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5">
                  Ghana Region
                </label>
                <select
                  value={regRegion}
                  onChange={(e) => handleRegionChange(e.target.value as GhanaRegion)}
                  className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-purple-600"
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r.region} value={r.region}>
                      {r.region}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-0.5">
                  City / Town
                </label>
                <select
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-purple-600"
                >
                  {getCitiesByRegion(regRegion).map((town) => (
                    <option key={town} value={town}>
                      {town}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-0.5">
                Bio (optional)
              </label>
              <input
                type="text"
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="What describes you in Ghana?"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-700/20 transition-all disabled:opacity-50 mt-1"
            >
              {loading ? 'Creating Account...' : 'Register on 8ATE'}
            </button>
          </form>
        )}

        {/* Privacy Promise Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400 leading-normal">
            <span className="font-semibold text-gray-600">Prototype privacy note:</span> Phone numbers are kept out of public profile fields, but browser storage is not a secure production account database. Do not enter a real private number.
          </p>
        </div>
      </div>
    </div>
  );
};
