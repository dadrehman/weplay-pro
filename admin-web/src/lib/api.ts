const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface CharmTierInfo {
  tier: 'STAR' | 'DIAMOND' | 'CROWN';
  subTier: number;
  label: string;
  icon: string;
}

export interface Family {
  id: string;
  name: string;
  badgeTag: string;
  badgeBgColor: string;
  badgeTextColor: string;
  level: number;
  iconUrl?: string | null;
  ownerId: string;
  owner?: { id: string; username: string; email: string; avatarUrl?: string | null };
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Title {
  id: string;
  name: string;
  rarityTier: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  textColor?: string;
  borderColor?: string | null;
  minLevel?: number;
  iconUrl?: string | null;
  isActive: boolean;
  isEquipped?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  category: string;
  shape?: string;
  badgeBgColor?: string;
  minLevel?: number;
  iconUrl?: string | null;
}

export interface User {
  id: string;
  displayId?: string | null;
  username: string;
  email: string;
  phone?: string | null;
  role: 'user' | 'admin' | 'superadmin';
  coinsBalance: string;
  charmPoints: string | number;
  expPoints: string | number;
  activeLevel: number;
  blessingPoints: string | number;
  signature: string;
  region: string;
  gender: string;
  isBanned: boolean;
  avatarUrl: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  family?: Family | null;
  equippedTitle?: Title | null;
  titles?: Title[];
  badges?: Badge[];
  charmTier?: CharmTierInfo;
  authProvider?: string | null;
  firebaseUid?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UsersResponse {
  data: User[];
  pagination: Pagination;
}

export interface AdminLog {
  id: string;
  adminId: string;
  targetUserId: string;
  actionType: 'COIN_ADJUST' | 'BAN' | 'UNBAN';
  amount: string | null;
  reason: string;
  timestamp: string;
  admin?: { id: string; username: string; email: string };
  targetUser?: { id: string; username: string; email: string };
}

export interface RoomSeat {
  id: string;
  roomId: string;
  seatIndex: number;
  userId: string | null;
  isLocked: boolean;
  isMuted: boolean;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    isBanned?: boolean;
  } | null;
}

export interface Room {
  id: string;
  title: string;
  hostId: string;
  isLocked: boolean;
  agoraChannel: string;
  status: 'ACTIVE' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
  occupiedSeatsCount: number;
  totalSeats: number;
  host?: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  };
  seats: RoomSeat[];
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('weplay_admin_token');
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('weplay_admin_token', token);
  }
}

export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('weplay_admin_token');
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      removeAuthToken();
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

// User Attributes CRUD
export async function updateUserAll(id: string, data: any): Promise<User> {
  const res = await apiFetch<{ message: string; data: User }>(`/api/admin/users/${id}/update-all`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Titles & Badges
export async function getTitles(): Promise<Title[]> {
  const res = await apiFetch<{ data: Title[] }>('/api/admin/titles');
  return res.data;
}

export async function getBadges(): Promise<Badge[]> {
  const res = await apiFetch<{ data: Badge[] }>('/api/admin/badges');
  return res.data;
}

export async function assignTitle(userId: string, titleId: string, isEquipped: boolean): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/titles/assign`, {
    method: 'POST',
    body: JSON.stringify({ titleId, isEquipped }),
  });
}

export async function revokeTitle(userId: string, titleId: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/titles/revoke`, {
    method: 'POST',
    body: JSON.stringify({ titleId }),
  });
}

export async function assignBadge(userId: string, badgeId: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/badges/assign`, {
    method: 'POST',
    body: JSON.stringify({ badgeId }),
  });
}

export async function revokeBadge(userId: string, badgeId: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/badges/revoke`, {
    method: 'POST',
    body: JSON.stringify({ badgeId }),
  });
}

// Families CRUD
export async function getFamilies(): Promise<Family[]> {
  const res = await apiFetch<{ data: Family[] }>('/api/admin/families');
  return res.data;
}

export async function createFamily(data: Partial<Family>): Promise<Family> {
  const res = await apiFetch<{ message: string; data: Family }>('/api/admin/families', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateFamily(id: string, data: Partial<Family>): Promise<Family> {
  const res = await apiFetch<{ message: string; data: Family }>(`/api/admin/families/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteFamily(id: string): Promise<void> {
  await apiFetch(`/api/admin/families/${id}`, {
    method: 'DELETE',
  });
}

// Title CRUD
export async function createTitle(data: Partial<Title>): Promise<Title> {
  const res = await apiFetch<{ message: string; data: Title }>('/api/admin/titles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTitle(id: string, data: Partial<Title>): Promise<Title> {
  const res = await apiFetch<{ message: string; data: Title }>(`/api/admin/titles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteTitle(id: string): Promise<void> {
  await apiFetch(`/api/admin/titles/${id}`, {
    method: 'DELETE',
  });
}

// Badge CRUD
export async function createBadge(data: Partial<Badge>): Promise<Badge> {
  const res = await apiFetch<{ message: string; data: Badge }>('/api/admin/badges', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateBadge(id: string, data: Partial<Badge>): Promise<Badge> {
  const res = await apiFetch<{ message: string; data: Badge }>(`/api/admin/badges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteBadge(id: string): Promise<void> {
  await apiFetch(`/api/admin/badges/${id}`, {
    method: 'DELETE',
  });
}

// User Recycle Bin / Trash
export async function restoreUser(id: string): Promise<{ message: string; data: User }> {
  return apiFetch(`/api/admin/users/${id}/restore`, {
    method: 'POST',
  });
}

export async function purgeUser(id: string): Promise<{ message: string }> {
  return apiFetch(`/api/admin/users/${id}/purge`, {
    method: 'DELETE',
  });
}


