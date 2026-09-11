import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

const cleanUrl = rawUrl.startsWith('http')
  ? rawUrl
  : rawUrl
  ? `https://${rawUrl}`
  : '';

export const isSupabaseConfigured = Boolean(
  cleanUrl &&
  rawKey &&
  cleanUrl.includes('.supabase.co') &&
  !cleanUrl.includes('your-project') &&
  !rawKey.includes('your-anon')
);

export const supabaseConfigDiagnostic = {
  urlDetected: Boolean(cleanUrl),
  urlPreview: cleanUrl ? (cleanUrl.length > 25 ? `${cleanUrl.slice(0, 25)}...` : cleanUrl) : 'NOT FOUND (Empty in build)',
  keyDetected: Boolean(rawKey),
  keyLength: rawKey ? rawKey.length : 0,
};

if (!isSupabaseConfigured) {
  console.warn(
    '[BUSSID Ventures] Supabase environment variables are missing or invalid.\n' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your hosting platform (Render/Vercel) Environment Variables and rebuild the site.\n' +
    `URL: ${supabaseConfigDiagnostic.urlPreview}\n` +
    `Key: ${supabaseConfigDiagnostic.keyDetected ? `Present (${supabaseConfigDiagnostic.keyLength} chars)` : 'Missing'}`
  );
}

const url = isSupabaseConfigured ? cleanUrl : 'https://placeholder-project.supabase.co';
const anonKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const LIVERY_IMAGES_BUCKET = 'livery-images';
export const LIVERY_FILES_BUCKET = 'livery-files';
export const SITE_ASSETS_BUCKET = 'site-assets';

export interface SiteSettings {
  id: number;
  hero_image_path: string | null;
  hero_image_url: string | null;
  featured_fleet_image_path: string | null;
  featured_fleet_image_url: string | null;
}

export interface HeroSlide {
  id: string;
  image_path: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface LiveryGalleryImage {
  id: string;
  livery_id: string;
  image_path: string;
  sort_order: number;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: 'founder' | 'admin' | 'user' | 'pending';
  approved: boolean;
  created_at: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  qr_image_path: string | null;
  qr_image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AboutSettings {
  id: number;
  hero_image_path: string | null;
  hero_image_url: string | null;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  return data as SiteSettings | null;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await supabase.from('hero_slides').select('*').order('sort_order', { ascending: true });
  return (data as HeroSlide[]) ?? [];
}

export async function addHeroSlide(path: string, url: string, sortOrder: number): Promise<void> {
  await supabase.from('hero_slides').insert({ image_path: path, image_url: url, sort_order: sortOrder });
}

export async function deleteHeroSlide(id: string, path: string): Promise<void> {
  await supabase.from('hero_slides').delete().eq('id', id);
  await supabase.storage.from(SITE_ASSETS_BUCKET).remove([path]);
}

export async function getLiveryGallery(liveryId: string): Promise<LiveryGalleryImage[]> {
  const { data } = await supabase
    .from('livery_images')
    .select('*')
    .eq('livery_id', liveryId)
    .order('sort_order', { ascending: true });
  return (data as LiveryGalleryImage[]) ?? [];
}

export async function addLiveryGalleryImage(liveryId: string, path: string, sortOrder: number): Promise<void> {
  await supabase.from('livery_images').insert({ livery_id: liveryId, image_path: path, sort_order: sortOrder });
}

export async function deleteLiveryGalleryImage(id: string, path: string): Promise<void> {
  await supabase.from('livery_images').delete().eq('id', id);
  await supabase.storage.from(LIVERY_IMAGES_BUCKET).remove([path]);
}

export async function getAdminProfile(): Promise<AdminProfile | null> {
  const { data } = await supabase.from('admin_profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle();
  return data as AdminProfile | null;
}

export async function getAllAdminProfiles(): Promise<AdminProfile[]> {
  const { data } = await supabase.rpc('get_admin_profiles');
  return (data as AdminProfile[]) ?? [];
}

export async function approveAdminAccount(email: string, role: 'admin' | 'user' = 'admin'): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('approve_account', { p_email: email, p_role: role });
  if (error) {
    const fallback = await supabase.rpc('approve_admin', { p_email: email });
    return { error: fallback.error ? fallback.error.message : null };
  }
  return { error: null };
}

export async function rejectAdminAccount(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_user_or_admin', { p_email: email });
  if (error) {
    const fallback = await supabase.rpc('reject_admin', { p_email: email });
    return { error: fallback.error ? fallback.error.message : null };
  }
  return { error: null };
}

export async function setAdminRole(email: string, role: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_account_role', { p_email: email, p_role: role });
  if (error) {
    const fallback = await supabase.rpc('set_admin_role', { p_email: email, p_role: role });
    return { error: fallback.error ? fallback.error.message : null };
  }
  return { error: null };
}

// --- Social links ---
export async function getSocialLinks(): Promise<SocialLink[]> {
  const { data } = await supabase.from('social_links').select('*').order('sort_order', { ascending: true });
  return (data as SocialLink[]) ?? [];
}

export async function updateSocialLink(id: string, updates: Partial<SocialLink>): Promise<void> {
  await supabase.from('social_links').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function addSocialLink(platform: string, label: string, url: string, sortOrder: number): Promise<void> {
  await supabase.from('social_links').insert({ platform, label, url, sort_order: sortOrder, is_active: true });
}

export async function deleteSocialLink(id: string): Promise<void> {
  await supabase.from('social_links').delete().eq('id', id);
}

// --- About settings ---
export async function getAboutSettings(): Promise<AboutSettings | null> {
  const { data } = await supabase.from('about_settings').select('*').eq('id', 1).maybeSingle();
  return data as AboutSettings | null;
}

export async function updateAboutHeroImage(path: string, url: string): Promise<void> {
  await supabase.from('about_settings').upsert({ id: 1, hero_image_path: path, hero_image_url: url, updated_at: new Date().toISOString() });
}

export async function clearAboutHeroImage(): Promise<void> {
  await supabase.from('about_settings').update({ hero_image_path: null, hero_image_url: null, updated_at: new Date().toISOString() }).eq('id', 1);
}

// --- Featured fleet image ---
export async function updateFeaturedFleetImage(path: string, url: string): Promise<void> {
  await supabase.from('site_settings').update({ featured_fleet_image_path: path, featured_fleet_image_url: url }).eq('id', 1);
}

export async function clearFeaturedFleetImage(): Promise<void> {
  await supabase.from('site_settings').update({ featured_fleet_image_path: null, featured_fleet_image_url: null }).eq('id', 1);
}

export function publicImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from(LIVERY_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function downloadLiveryFile(liveryId: string): Promise<{ ok: boolean; url: string | null }> {
  const { data, error } = await supabase.rpc('increment_livery_downloads', { p_id: liveryId });
  if (error || !data) return { ok: false, url: null };
  const filePath = data as string;
  if (!filePath) return { ok: false, url: null };
  const { data: urlData } = supabase.storage.from(LIVERY_FILES_BUCKET).getPublicUrl(filePath);
  return { ok: true, url: urlData.publicUrl };
}

// ==========================================
// Community features
// ==========================================

export interface LiveryStats {
  likes_count: number;
  ratings_avg: number;
  ratings_count: number;
  comments_count: number;
  shares_count: number;
}

export interface CommentData {
  id: string;
  livery_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  likes_count?: number;
  replies?: CommentData[];
}

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

// --- Livery stats with in-memory TTL cache (prevents N+1 RPC network storms) ---
const liveryStatsCache = new Map<string, { data: LiveryStats; expires: number }>();

export function invalidateLiveryStats(liveryId?: string) {
  if (liveryId) liveryStatsCache.delete(liveryId);
  else liveryStatsCache.clear();
}

export async function getLiveryStats(liveryId: string): Promise<LiveryStats> {
  const cached = liveryStatsCache.get(liveryId);
  const now = Date.now();
  if (cached && cached.expires > now) {
    return cached.data;
  }
  const { data } = await supabase.rpc('get_livery_stats', { p_livery_id: liveryId });
  const result = (data as unknown as LiveryStats) ?? { likes_count: 0, ratings_avg: 0, ratings_count: 0, comments_count: 0, shares_count: 0 };
  liveryStatsCache.set(liveryId, { data: result, expires: now + 60_000 });
  return result;
}

// --- Likes ---
export async function toggleLike(liveryId: string): Promise<number> {
  invalidateLiveryStats(liveryId);
  const { data } = await supabase.rpc('toggle_livery_like', { p_livery_id: liveryId });
  return (data as number) ?? 0;
}

export async function hasUserLiked(liveryId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('livery_likes')
    .select('id')
    .eq('livery_id', liveryId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

// --- Ratings ---
export async function submitRating(liveryId: string, rating: number): Promise<{ avg_rating: number; rating_count: number }> {
  invalidateLiveryStats(liveryId);
  const { data } = await supabase.rpc('submit_livery_rating', { p_livery_id: liveryId, p_rating: rating });
  if (!data) return { avg_rating: 0, rating_count: 0 };
  const row = data as unknown as { avg_rating: number; rating_count: number };
  return { avg_rating: Number(row.avg_rating), rating_count: Number(row.rating_count) };
}

export async function getUserRating(liveryId: string, userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('livery_ratings')
    .select('rating')
    .eq('livery_id', liveryId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.rating ?? null;
}

// --- Comments ---
export async function getComments(liveryId: string): Promise<CommentData[]> {
  const { data } = await supabase
    .from('comments')
    .select('*, user:auth.users!comments_user_id_fkey1(email)')
    .eq('livery_id', liveryId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });
  if (!data) return [];
  return (data as unknown as Array<{ id: string; livery_id: string; user_id: string; parent_id: string | null; content: string; status: string; created_at: string; updated_at: string; user: { email: string } | null }>).map((r) => ({
    id: r.id,
    livery_id: r.livery_id,
    user_id: r.user_id,
    parent_id: r.parent_id,
    content: r.content,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    user_email: r.user?.email ?? 'Unknown',
  }));
}

export async function getCommentLikes(commentId: string): Promise<number> {
  const { count } = await supabase
    .from('comment_likes')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId);
  return count ?? 0;
}

export async function hasUserLikedComment(commentId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function toggleCommentLike(commentId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .maybeSingle();
  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('comment_likes').insert({ comment_id: commentId });
  }
}

export async function postComment(liveryId: string, content: string, parentId: string | null = null): Promise<CommentData | null> {
  const { data } = await supabase
    .from('comments')
    .insert({ livery_id: liveryId, content, parent_id: parentId })
    .select('id, livery_id, user_id, parent_id, content, status, created_at, updated_at')
    .single();
  return data as unknown as CommentData | null;
}

export async function updateComment(commentId: string, content: string): Promise<void> {
  await supabase.from('comments').update({ content, updated_at: new Date().toISOString() }).eq('id', commentId);
}

export async function deleteComment(commentId: string): Promise<void> {
  await supabase.from('comments').delete().eq('id', commentId);
}

// --- Notifications ---
export async function getNotifications(): Promise<NotificationData[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as NotificationData[]) ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.rpc('mark_all_notifications_read');
}

// --- Shares ---
export async function trackShare(liveryId: string, platform: string): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  await supabase.from('livery_shares').insert({ livery_id: liveryId, platform, user_id: userId ?? null });
}

export async function getShareCount(liveryId: string): Promise<number> {
  const { count } = await supabase
    .from('livery_shares')
    .select('*', { count: 'exact', head: true })
    .eq('livery_id', liveryId);
  return count ?? 0;
}

// --- Reports ---
export async function reportContent(targetType: 'livery' | 'comment', targetId: string, reason: string): Promise<void> {
  await supabase.from('reports').insert({ target_type: targetType, target_id: targetId, reason });
}

// --- Community uploads ---
export async function uploadCommunityLivery(params: {
  name: string;
  vehicle_name: string;
  creator: string;
  category_id: string | null;
  description: string;
  image_path: string;
  file_path: string | null;
  file_name: string | null;
}): Promise<{ id: string | null; error: string | null }> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const { data, error } = await supabase.from('liveries').insert({
    ...params,
    user_id: userId,
    status: 'pending',
    downloads: 0,
    badge: null,
    is_featured: false,
  }).select('id').single();
  return { id: data?.id ?? null, error: error?.message ?? null };
}

export async function getUserLiveries(): Promise<Array<{ id: string; name: string; vehicle_name: string; creator: string; status: string; rejection_reason: string | null; image_path: string | null; created_at: string }>> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return [];
  const { data } = await supabase
    .from('liveries')
    .select('id, name, vehicle_name, creator, status, rejection_reason, image_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as Array<{ id: string; name: string; vehicle_name: string; creator: string; status: string; rejection_reason: string | null; image_path: string | null; created_at: string }>) ?? [];
}

// --- Admin moderation ---
export async function getPendingLiveries(): Promise<Array<{ id: string; name: string; vehicle_name: string; creator: string; description: string | null; image_path: string | null; file_path: string | null; file_name: string | null; user_id: string | null; created_at: string; rejection_reason: string | null; status: string }>> {
  const { data } = await supabase.rpc('get_pending_liveries');
  return (data as Array<{ id: string; name: string; vehicle_name: string; creator: string; description: string | null; image_path: string | null; file_path: string | null; file_name: string | null; user_id: string | null; created_at: string; rejection_reason: string | null; status: string }>) ?? [];
}

export async function approveLivery(liveryId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('approve_livery', { p_livery_id: liveryId });
  return { error: error?.message ?? null };
}

export async function rejectLivery(liveryId: string, reason: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('reject_livery', { p_livery_id: liveryId, p_reason: reason });
  return { error: error?.message ?? null };
}

export async function getModerationStats(): Promise<{ pending_count: number; reported_liveries_count: number; reported_comments_count: number; flagged_users_count: number }> {
  const { data } = await supabase.rpc('get_moderation_stats');
  if (!data) return { pending_count: 0, reported_liveries_count: 0, reported_comments_count: 0, flagged_users_count: 0 };
  return data as unknown as { pending_count: number; reported_liveries_count: number; reported_comments_count: number; flagged_users_count: number };
}

export async function getReports(): Promise<Array<{ id: string; reporter_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string }>> {
  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return (data as Array<{ id: string; reporter_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string }>) ?? [];
}

export async function resolveReport(reportId: string): Promise<void> {
  await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
}

export async function dismissReport(reportId: string): Promise<void> {
  await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
}

export async function hideComment(commentId: string): Promise<void> {
  await supabase.from('comments').update({ status: 'hidden' }).eq('id', commentId);
}

export async function restoreComment(commentId: string): Promise<void> {
  await supabase.from('comments').update({ status: 'visible' }).eq('id', commentId);
}

// --- Analytics ---
export async function getAnalyticsStats(): Promise<{ total_users: number; total_liveries: number; total_downloads: number; total_comments: number; total_likes: number; total_ratings: number }> {
  const { data } = await supabase.rpc('get_analytics_stats');
  if (!data) return { total_users: 0, total_liveries: 0, total_downloads: 0, total_comments: 0, total_likes: 0, total_ratings: 0 };
  return data as unknown as { total_users: number; total_liveries: number; total_downloads: number; total_comments: number; total_likes: number; total_ratings: number };
}

export async function getPopularLiveries(limit: number = 10): Promise<Array<{ id: string; name: string; vehicle_name: string; creator: string; image_path: string | null; downloads: number; likes_count: number }>> {
  const { data } = await supabase.rpc('get_popular_liveries', { p_limit: limit });
  return (data as Array<{ id: string; name: string; vehicle_name: string; creator: string; image_path: string | null; downloads: number; likes_count: number }>) ?? [];
}

export async function getPopularCreators(limit: number = 10): Promise<Array<{ creator: string; dl_count: number; livery_count: number }>> {
  const { data } = await supabase.rpc('get_popular_creators', { p_limit: limit });
  return (data as Array<{ creator: string; dl_count: number; livery_count: number }>) ?? [];
}

export async function getPopularVehicles(limit: number = 10): Promise<Array<{ vehicle_name: string; livery_count: number; dl_count: number }>> {
  const { data } = await supabase.rpc('get_popular_vehicles', { p_limit: limit });
  return (data as Array<{ vehicle_name: string; livery_count: number; dl_count: number }>) ?? [];
}

// --- Tournament registrations ---
export async function registerForTournament(params: {
  tournament_id: string;
  player_name: string;
  player_email: string;
  in_game_id: string;
  phone?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('register_for_tournament', {
    p_tournament_id: params.tournament_id,
    p_player_name: params.player_name,
    p_player_email: params.player_email,
    p_in_game_id: params.in_game_id,
    p_phone: params.phone ?? null,
    p_notes: params.notes ?? null,
  });
  return { success: !!data, error: error?.message ?? null };
}

export async function isRegisteredForTournament(tournamentId: string): Promise<boolean> {
  const { data } = await supabase.rpc('is_registered_for_tournament', { p_tournament_id: tournamentId });
  return !!data;
}

export async function getTournamentRegistrations(tournamentId: string): Promise<Array<{
  id: string; tournament_id: string; user_id: string; player_name: string;
  player_email: string; in_game_id: string; phone: string | null; notes: string | null;
  status: string; created_at: string;
}>> {
  const { data } = await supabase.rpc('get_tournament_registrations', { p_tournament_id: tournamentId });
  return (data as Array<{ id: string; tournament_id: string; user_id: string; player_name: string; player_email: string; in_game_id: string; phone: string | null; notes: string | null; status: string; created_at: string }>) ?? [];
}

export async function getUserTournamentRegistrations(): Promise<Array<{
  tournament_id: string; tournament_name: string; player_name: string; in_game_id: string; status: string; created_at: string;
}>> {
  const { data } = await supabase.rpc('get_user_tournament_registrations');
  return (data as Array<{ tournament_id: string; tournament_name: string; player_name: string; in_game_id: string; status: string; created_at: string }>) ?? [];
}

// --- Download history ---
export async function trackDownload(liveryId: string, fileName: string | null): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase.from('download_history').insert({
    livery_id: liveryId,
    file_name: fileName,
  });
}

export interface DownloadHistoryEntry {
  id: string;
  livery_id: string;
  file_name: string | null;
  created_at: string;
  livery_name: string;
  vehicle_name: string;
  creator: string;
  image_path: string | null;
  livery_file_path: string | null;
  livery_file_name: string | null;
}

export async function getUserDownloads(): Promise<DownloadHistoryEntry[]> {
  const { data } = await supabase
    .from('download_history')
    .select(`
      id, livery_id, file_name, created_at,
      liveries!inner(name, vehicle_name, creator, image_path, file_path, file_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);
  if (!data) return [];
  return (data as unknown as Array<{
    id: string; livery_id: string; file_name: string | null; created_at: string;
    liveries: { name: string; vehicle_name: string; creator: string; image_path: string | null; file_path: string | null; file_name: string | null };
  }>).map((r) => ({
    id: r.id,
    livery_id: r.livery_id,
    file_name: r.file_name,
    created_at: r.created_at,
    livery_name: r.liveries.name,
    vehicle_name: r.liveries.vehicle_name,
    creator: r.liveries.creator,
    image_path: r.liveries.image_path,
    livery_file_path: r.liveries.file_path,
    livery_file_name: r.liveries.file_name,
  }));
}
