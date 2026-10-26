/**
 * 8ATE - Hubs Marketplace & Services Service
 */

import { HubListing, HubCategory, GhanaRegion, UserProfile } from '../types';
import { IHubRepository } from '../repositories/interfaces';
import { LocalHubRepository } from '../repositories/localStorageRepository';

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
    if (!params.title.trim()) throw new Error('Listing title is required.');
    if (!params.description.trim()) throw new Error('Listing description is required.');
    if (params.price < 0) throw new Error('Price must be a valid amount.');

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
