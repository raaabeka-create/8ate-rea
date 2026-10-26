/**
 * 8ATE - Cross-Application Search Service
 * 
 * Safely searches across Chats, Public Users, Regional Walls, Hubs, and Discover.
 * CRITICAL: Never exposes private phone numbers.
 */

import {
  UserProfile,
  Conversation,
  PublicAnonymousWallPost,
  HubListing,
  DiscoverPost,
} from '../types';
import {
  LocalAuthRepository,
  LocalChatRepository,
  LocalWallRepository,
  LocalHubRepository,
  LocalDiscoverRepository,
} from '../repositories/localStorageRepository';

export interface SearchResults {
  users: UserProfile[];
  conversations: Conversation[];
  walls: PublicAnonymousWallPost[];
  hubs: HubListing[];
  discover: DiscoverPost[];
}

export class SearchService {
  private authRepo = new LocalAuthRepository();
  private chatRepo = new LocalChatRepository();
  private wallRepo = new LocalWallRepository();
  private hubRepo = new LocalHubRepository();
  private discoverRepo = new LocalDiscoverRepository();

  async globalSearch(query: string, currentUserId: string): Promise<SearchResults> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        users: [],
        conversations: [],
        walls: [],
        hubs: [],
        discover: [],
      };
    }

    const [allUsers, convs, activeWalls, hubListings, discoverPosts] = await Promise.all([
      this.authRepo.getAllUsers(),
      this.chatRepo.getConversations(currentUserId),
      this.wallRepo.getActivePosts(),
      this.hubRepo.getListings(),
      this.discoverRepo.getPosts(),
    ]);

    // Match users by @username or displayName (strictly exclude current user and NO phone numbers exposed)
    const users = allUsers.filter(
      (u) =>
        u.id !== currentUserId &&
        (u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) ||
          u.region.toLowerCase().includes(q))
    );

    // Match conversations
    const matchedConvs = convs.filter((c) => {
      const nameMatch = c.isGroup
        ? c.name?.toLowerCase().includes(q)
        : c.participants.some((p) => p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q));
      const msgMatch = c.lastMessage?.content.toLowerCase().includes(q);
      return nameMatch || msgMatch;
    });

    // Match active wall posts
    const matchedWalls = activeWalls.filter(
      (w) =>
        w.content.toLowerCase().includes(q) ||
        w.originLocation.toLowerCase().includes(q) ||
        w.destinationLocation.toLowerCase().includes(q)
    );

    // Match hub listings
    const matchedHubs = hubListings.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q)
    );

    // Match discover posts
    const matchedDiscover = discoverPosts.filter(
      (d) =>
        d.content.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        d.author.displayName.toLowerCase().includes(q)
    );

    return {
      users,
      conversations: matchedConvs,
      walls: matchedWalls,
      hubs: matchedHubs,
      discover: matchedDiscover,
    };
  }
}
