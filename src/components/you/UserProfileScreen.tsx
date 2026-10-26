import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Shield,
  Phone,
  Bookmark,
  Store,
  Compass,
  Edit3,
  LogOut,
  Users,
  CheckCircle2,
  Lock,
  X,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HubListing, DiscoverPost, GhanaRegion, UserProfile } from '../../types';
import { hubService, discoverService, safetyService } from '../../services';
import { GHANA_REGIONS, getCitiesByRegion } from '../../data/ghanaData';

export const UserProfileScreen: React.FC = () => {
  const { user, allUsers, switchUser, logout, updateUserProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'saved' | 'my_listings' | 'switcher' | 'safety'>('saved');
  const [savedHubs, setSavedHubs] = useState<HubListing[]>([]);
  const [savedPosts, setSavedPosts] = useState<DiscoverPost[]>([]);
  const [myListings, setMyListings] = useState<HubListing[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editRegion, setEditRegion] = useState<GhanaRegion>(user?.region || 'Ashanti');
  const [editCity, setEditCity] = useState(user?.city || 'Kumasi Central');

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allHubs = await hubService.getListings();
      setMyListings(allHubs.filter((h) => h.sellerId === user.id));

      const savedH = await hubService.getSavedListings(user.id);
      setSavedHubs(savedH);

      const savedP = await discoverService.getSavedPosts(user.id);
      setSavedPosts(savedP);

      const blocked = await safetyService.getBlockedUsers(user.id);
      setBlockedUsers(blocked);
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (user) {
      setEditDisplayName(user.displayName);
      setEditBio(user.bio || '');
      setEditRegion(user.region);
      setEditCity(user.city);
    }
  }, [user]);

  if (!user) return null;

  const handleRegionChange = (newReg: GhanaRegion) => {
    setEditRegion(newReg);
    const towns = getCitiesByRegion(newReg);
    setEditCity(towns[0] || 'Central');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        displayName: editDisplayName,
        bio: editBio,
        region: editRegion,
        city: editCity,
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Update profile error', err);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    await safetyService.unblockUser(user.id, blockedUserId);
    await loadData();
  };

  const maskPhone = (phone: string) => {
    if (phone.length <= 6) return phone;
    return `${phone.slice(0, 7)} **** ${phone.slice(-2)}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FC] pb-24 relative overflow-y-auto">
      {/* Profile Header Card */}
      <div className="max-w-2xl mx-auto w-full p-4">
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover ring-4 ring-purple-100 shadow-xs"
            />

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-0.5">
                <h2 className="text-lg font-extrabold text-gray-900">{user.displayName}</h2>
                {user.verified && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                )}
              </div>

              <div className="text-xs font-semibold text-purple-700">@{user.username}</div>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-gray-500 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>
                  {user.city}, {user.region} Region, Ghana
                </span>
              </div>

              {user.bio && (
                <p className="text-xs text-gray-700 mt-2 italic leading-relaxed">
                  &ldquo;{user.bio}&rdquo;
                </p>
              )}

              {/* Private phone pill */}
              <div className="mt-3 inline-flex items-center gap-1.5 bg-purple-50 px-3 py-1 rounded-xl text-[11px] font-semibold text-purple-900 border border-purple-100">
                <Lock className="w-3 h-3 text-purple-700" />
                <span>Phone: {maskPhone(user.phoneNumber)}</span>
                <span className="text-purple-500 text-[10px] font-normal">(Private)</span>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setIsEditingProfile(true)}
              className="p-2 text-purple-700 hover:bg-purple-50 rounded-xl border border-purple-200 shadow-2xs text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="grid grid-cols-4 gap-1.5 bg-gray-100 p-1 rounded-2xl my-4 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('saved')}
            className={`py-2 px-1 rounded-xl transition-all text-center truncate ${
              activeSubTab === 'saved'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Saved Items
          </button>
          <button
            onClick={() => setActiveSubTab('my_listings')}
            className={`py-2 px-1 rounded-xl transition-all text-center truncate ${
              activeSubTab === 'my_listings'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Hubs ({myListings.length})
          </button>
          <button
            onClick={() => setActiveSubTab('switcher')}
            className={`py-2 px-1 rounded-xl transition-all text-center truncate ${
              activeSubTab === 'switcher'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Switch User (Dev)
          </button>
          <button
            onClick={() => setActiveSubTab('safety')}
            className={`py-2 px-1 rounded-xl transition-all text-center truncate ${
              activeSubTab === 'safety'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Safety & Blocked
          </button>
        </div>

        {/* Tab 1: Saved Items */}
        {activeSubTab === 'saved' && (
          <div className="space-y-4">
            {/* Saved Hub Listings */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-purple-600" />
                <span>Saved Hub Listings ({savedHubs.length})</span>
              </h3>
              {savedHubs.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No saved marketplace listings yet.</p>
              ) : (
                <div className="space-y-2">
                  {savedHubs.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-gray-900">{h.title}</div>
                        <div className="text-[11px] text-purple-700 font-semibold">
                          ₵{h.price.toLocaleString()} • {h.city}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Discover Posts */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-600" />
                <span>Saved Discover Posts ({savedPosts.length})</span>
              </h3>
              {savedPosts.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No saved Discover posts yet.</p>
              ) : (
                <div className="space-y-2">
                  {savedPosts.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-100"
                    >
                      <div className="text-[11px] font-bold text-purple-700">
                        {p.author.displayName} • {p.category}
                      </div>
                      <p className="text-xs text-gray-800 line-clamp-2 mt-0.5">{p.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: My Hub Listings */}
        {activeSubTab === 'my_listings' && (
          <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Listings You Published
            </h3>
            {myListings.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                You haven&apos;t posted any items on Ghana Hubs yet.
              </div>
            ) : (
              myListings.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                    <h4 className="font-bold text-xs text-gray-900 mt-1">{item.title}</h4>
                    <div className="text-xs font-black text-purple-900">
                      ₵{item.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Dev Profile Switcher */}
        {activeSubTab === 'switcher' && (
          <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                Multi-User Dev Testing
              </h3>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                Zero-Budget Local
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Instantly switch profiles to test real-time chat replies, anonymous regional wall voting, and marketplace inquiries:
            </p>
            <div className="space-y-2">
              {allUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    u.id === user.id
                      ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                      : 'bg-white border-gray-100 hover:bg-purple-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-200"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-900">{u.displayName}</div>
                      <div className="text-[11px] text-gray-500">
                        @{u.username} • {u.city}
                      </div>
                    </div>
                  </div>
                  {u.id === user.id ? (
                    <span className="text-xs font-bold text-purple-700">Active</span>
                  ) : (
                    <button className="text-xs font-semibold text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                      Switch
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Safety & Blocked */}
        {activeSubTab === 'safety' && (
          <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Community Safety & Blocked Accounts</span>
            </h3>
            {blockedUsers.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No accounts currently blocked.</p>
            ) : (
              blockedUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between"
                >
                  <div className="text-xs font-bold text-gray-900">{u.displayName} (@{u.username})</div>
                  <button
                    onClick={() => handleUnblock(u.id)}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sign out button */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-center">
          <button
            onClick={logout}
            className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of 8ATE</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
              <h3 className="font-bold text-sm text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ghana Region
                  </label>
                  <select
                    value={editRegion}
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    City / Town
                  </label>
                  <select
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-purple-600"
                  >
                    {getCitiesByRegion(editRegion).map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bio / Motto
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
