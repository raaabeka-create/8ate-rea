/**
 * 8ATE - Cross-Application Search Service
 * 
 * Searches public profile fields and active content across Chats, Users, Walls, Hubs, and Discover.
 * It deliberately does not read private phone-number fields.
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
import {
  IAuthRepository,
  IChatRepository,
  IWallRepository,
  IHubRepository,
  IDiscoverRepository,
} from '../repositories/interfaces';

export interface SearchResults {
  users: UserProfile[];
  conversations: Conversation[];
  walls: PublicAnonymousWallPost[];
  hubs: HubListing[];
  discover: DiscoverPost[];
}

export class SearchService {
  constructor(
    private readonly authRepo: IAuthRepository = new LocalAuthRepository(),
    private readonly chatRepo: IChatRepository = new LocalChatRepository(),
    private readonly wallRepo: IWallRepository = new LocalWallRepository(),
    private readonly hubRepo: IHubRepository = new LocalHubRepository(),
    private readonly discoverRepo: IDiscoverRepository = new LocalDiscoverRepository(),
  ) {}

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
