import React, { useState } from 'react';
import { X, Store, DollarSign, MapPin, Image as ImageIcon, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hubService } from '../../services';
import { HubCategory, GhanaRegion } from '../../types';
import { GHANA_REGIONS, getCitiesByRegion } from '../../data/ghanaData';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onListingCreated,
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [category, setCategory] = useState<HubCategory>('Marketplace');
  const [region, setRegion] = useState<GhanaRegion>(user?.region || 'Greater Accra');
  const [city, setCity] = useState(user?.city || 'Accra Central');
  const [selectedImageUrl, setSelectedImageUrl] = useState(
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const categories: HubCategory[] = [
    'Housing',
    'Jobs',
    'Marketplace',
    'Services',
    'Transport',
    'Food',
    'Education',
    'Events',
    'Football',
    'Music',
  ];

  const handleRegionChange = (newRegion: GhanaRegion) => {
    setRegion(newRegion);
    const cities = getCitiesByRegion(newRegion);
    setCity(cities[0] || 'Central');
  };

  const sampleImages = [
    { label: 'Hostel / Room', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80' },
    { label: 'Laptop / Tech', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80' },
    { label: 'Ghanaian Food', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80' },
    { label: 'Transport / Delivery', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80' },
    { label: 'Developer / Service', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!title.trim() || !description.trim() || isNaN(numPrice)) {
      setError('Please provide title, description, and valid price in GHS ₵.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await hubService.createListing({
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        isNegotiable,
        region,
        city,
        category,
        images: [selectedImageUrl],
        seller: user,
      });
      onListingCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish Hub listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-base text-gray-900">Post Listing on Ghana Hubs</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">Prototype only: choose from sample images; uploading your own photos is not implemented.</p>
          {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all truncate ${
                    category === cat
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Listing Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2-in-a-room hostel at KNUST Ayeduase, iPhone 14 Pro, etc."
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600 focus:bg-white"
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Price (Ghanaian Cedis ₵)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-purple-700">₵</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2500"
                  className="w-full pl-7 pr-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span>Price Negotiable</span>
              </label>
            </div>
          </div>

          {/* Region and City */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Ghana Region
              </label>
              <select
                value={region}
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
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-purple-600"
              >
                {getCitiesByRegion(region).map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Description & Details
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, location perks, specs, or availability..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-purple-600 focus:bg-white"
            />
          </div>

          {/* Photo sample selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Listing Photo
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sampleImages.map((sample) => (
                <div
                  key={sample.label}
                  onClick={() => setSelectedImageUrl(sample.url)}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImageUrl === sample.url ? 'border-purple-600 ring-2 ring-purple-300' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={sample.url}
                    alt={sample.label}
                    referrerPolicy="no-referrer"
                    className="w-16 h-12 object-cover"
                  />
                  <div className="text-[9px] font-bold text-center bg-gray-900/80 text-white truncate px-1">
                    {sample.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Publishing...' : 'Publish Listing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
