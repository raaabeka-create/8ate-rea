/**
 * 8ATE - Hubs Marketplace & Services Service
 */

import { HubListing, HubCategory, GhanaRegion, UserProfile } from '../types';
import { IHubRepository } from '../repositories/interfaces';
import { LocalHubRepository } from '../repositories/localStorageRepository';
import { isSecureHttpsUrl } from '../utils/secureUrl';

export interface CreateListingParams {
  title: string;
  description: string;
  price: number;
  isNegotiable?: boolean;
  region: GhanaRegion;
  city: string;
  category: HubCategory;
  images: string[];
  seller: UserProfile;
}

export class HubService {
  private hubRepo: IHubRepository;

  constructor(hubRepo: IHubRepository = new LocalHubRepository()) {
    this.hubRepo = hubRepo;
  }

  async getListings(filters?: {
    category?: HubCategory;
    region?: GhanaRegion;
    city?: string;
    searchQuery?: string;
  }): Promise<HubListing[]> {
    return this.hubRepo.getListings(filters);
  }

  async getListingById(id: string): Promise<HubListing | null> {
    const listing = await this.hubRepo.getListingById(id);
    if (listing) {
      this.hubRepo.incrementViews(id).catch(console.error);
    }
    return listing;
  }

  async createListing(params: CreateListingParams): Promise<HubListing> {
    if (!params.title.trim() || params.title.trim().length > 120) throw new Error('Listing title must contain 1–120 characters.');
    if (!params.description.trim() || params.description.trim().length > 5000) throw new Error('Listing description must contain 1–5000 characters.');
    if (!Number.isFinite(params.price) || params.price < 0) throw new Error('Price must be a valid non-negative amount.');
    if (!params.seller?.id) throw new Error('A seller account is required.');
    if (params.images.length > 5 || params.images.some((url) => !isSecureHttpsUrl(url))) {
      throw new Error('Listings can use up to five secure HTTPS image URLs.');
    }

    const defaultImg =
      params.images.length > 0
        ? params.images
        : ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80'];

    return this.hubRepo.createListing({
      title: params.title.trim(),
      description: params.description.trim(),
      price: params.price,
      isNegotiable: !!params.isNegotiable,
      region: params.region,
      city: params.city,
      category: params.category,
      sellerId: params.seller.id,
      seller: {
        id: params.seller.id,
        username: params.seller.username,
        displayName: params.seller.displayName,
        avatarUrl: params.seller.avatarUrl,
        region: params.seller.region,
        city: params.seller.city,
      },
      images: defaultImg,
    });
  }

  async toggleSaveListing(listingId: string, userId: string): Promise<boolean> {
    return this.hubRepo.toggleSaveListing(listingId, userId);
  }

  async getSavedListings(userId: string): Promise<HubListing[]> {
    return this.hubRepo.getSavedListings(userId);
  }
}
