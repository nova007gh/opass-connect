'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, apiDelete, apiUpload } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

interface GroupDetail {
  id: string; year: number; name: string; description?: string | null; imageUrl?: string | null;
  creatorId?: string | null; isMember: boolean; isBanned: boolean; isRestricted: boolean; canManage: boolean;
  _count: { memberships: number };
}
interface Post {
  id: string; body?: string | null; imageUrl?: string | null; videoUrl?: string | null; createdAt: string;
  user: { id: string; profile?: { fullName?: string | null; avatarUrl?: string | null } | null };
  _count: { likes: number; comments: number };
  likedByMe: boolean;
}
interface Comment {
  id: string; body: string; createdAt: string;
  user: { id: string; profile?: { fullName?: string | null; avatarUrl?: string | null } | null };
}
interface Member {
  id: string; userId: string; banned: boolean; restricted: boolean; isLeader: boolean;
  user: { id: string; email: string; profile?: { fullName?: string | null; avatarUrl?: string | null; graduationYear?: number | null } | null };
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function videoEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return <iframe src={`https://www.youtube.com/embed/${yt[1]}`} style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 12 }} allowFullScreen />;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 12 }} allowFullScreen />;
  return <video src={url} controls style={{ width: '100%', borderRadius: 12, maxHeight: 400 }} />;
}

export default function YearGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [composerText, setComposerText] = useState('');
  const [composerImage, setComposerImage] = useState<{ file: File; preview: string } | null>(null);
  const [composerVideoUrl, setComposerVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState<Set<string>>(new Set());

  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);

  const loadGroup = useCallback(() => {
    apiGet<GroupDetail>(`/year-groups/${groupId}`)
      .then(setGroup)
      .catch(() => setError('Failed to load year group'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const loadPosts = useCallback((cursor?: string) => {
    const url = `/year-groups/${groupId}/posts${cursor ? `?cursor=${cursor}` : ''}`;
    return apiGet<Post[]>(url).then(data => {
      if (cursor) setPosts(prev => [...prev, ...data]);
      else setPosts(data);
      setHasMore(data.length === 20);
    }).catch(() => { if (!cursor) setPosts([]); });
  }, [groupId]);

  useEffect(() => { loadGroup(); }, [loadGroup]);
  useEffect(() => {
    if (!group?.isMember && !group?.canManage) { setPostsLoading(false); return; }
    setPostsLoading(true);
    loadPosts().finally(() => setPostsLoading(false));
  }, [group?.isMember, group?.canManage, loadPosts]);

  // Light polling to keep the feed "live"
  useEffect(() => {
    if (!group?.isMember && !group?.canManage) return;
    const interval = setInterval(() => { loadPosts(); }, 15000);
    return () => clearInterval(interval);
  }, [group?.isMember, group?.canManage, loadPosts]);

  const pickImage = () => imageInputRef.current?.click();
  const onImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setComposerImage({ file, preview: URL.createObjectURL(file) });
  };

  const submitPost = async () => {
    if (!composerText.trim() && !composerImage && !composerVideoUrl.trim()) return;
    setPosting(true);
    setError('');
    try {
      let imageUrl: string | undefined;
      if (composerImage) {
        const res = await apiUpload<{ imageUrl: string }>(`/year-groups/${groupId}/post-image`, composerImage.file);
        imageUrl = res.imageUrl;
      }
      const post = await apiPost<Post>(`/year-groups/${groupId}/posts`, {
        body: composerText.trim() || undefined,
        imageUrl,
        videoUrl: composerVideoUrl.trim() || undefined,
      });
      setPosts(prev => [post, ...prev]);
      setComposerText(''); setComposerImage(null); setComposerVideoUrl(''); setShowVideoInput(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likedByMe: !p.likedByMe, _count: { ...p._count, likes: p._count.likes + (p.likedByMe ? -1 : 1) } } : p));
    try { await apiPost(`/year-groups/${groupId}/posts/${post.id}/like`); } catch { /* revert on failure not critical */ }
  };

  const deletePost = async (postId: string) => {
    try {
      await apiDelete(`/year-groups/${groupId}/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) { setError(err.message || 'Failed to delete post'); }
  };

  const toggleComments = async (postId: string) => {
    const next = new Set(openComments);
    if (next.has(postId)) { next.delete(postId); setOpenComments(next); return; }
    next.add(postId); setOpenComments(next);
    if (!commentsByPost[postId]) {
      setCommentsLoading(prev => new Set(prev).add(postId));
      try {
        const list = await apiGet<Comment[]>(`/year-groups/${groupId}/posts/${postId}/comments`);
        setCommentsByPost(prev => ({ ...prev, [postId]: list }));
      } catch { setCommentsByPost(prev => ({ ...prev, [postId]: [] })); }
      finally { setCommentsLoading(prev => { const s = new Set(prev); s.delete(postId); return s; }); }
    }
  };

  const submitComment = async (postId: string) => {
    const body = (commentInputs[postId] || '').trim();
    if (!body) return;
    try {
      const comment = await apiPost<Comment>(`/year-groups/${groupId}/posts/${postId}/comments`, { body });
      setCommentsByPost(prev => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err: any) { setError(err.message || 'Failed to comment'); }
  };

  const sharePost = (postId: string) => {
    const link = `${window.location.origin}/dashboard/groups/${groupId}?post=${postId}`;
    navigator.clipboard?.writeText(link).then(() => {
      setSuccess('Link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    });
  };

  const openMembers = async () => {
    setMembersOpen(true);
    setMembersLoading(true);
    try {
      const list = await apiGet<Member[]>(`/year-groups/${groupId}/members`);
      setMembers(list);
    } catch { setMembers([]); } finally { setMembersLoading(false); }
  };

  const moderate = async (userId: string, action: 'ban' | 'unban' | 'restrict' | 'unrestrict') => {
    setModerating(userId + action);
    try {
      await apiPost(`/year-groups/${groupId}/members/${userId}/moderate`, { action });
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, banned: action === 'ban' ? true : action === 'unban' ? false : m.banned, restricted: action === 'restrict' ? true : action === 'unrestrict' ? false : m.restricted } : m));
      loadGroup();
    } catch (err: any) { setError(err.message || 'Failed to update member'); } finally { setModerating(null); }
  };

  if (loading) {
    return <div className="app-screen fade-in"><div className="loading-center"><span className="spinner" /></div></div>;
  }
  if (!group) {
    return <div className="app-screen fade-in"><div className="empty-state"><h3>Year group not found</h3><Link href="/dashboard/groups" className="btn btn-sm">Back to Year Groups</Link></div></div>;
  }
  if (group.isBanned) {
    return (
      <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
        <div className="screen-header"><button onClick={() => router.push('/dashboard/groups')} className="back"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button><h1>{group.name}</h1></div>
        <div className="app-pad"><div className="empty-state card"><h3>You've been removed from this group</h3><p>Contact an admin if you believe this was a mistake.</p></div></div>
      </div>
    );
  }
  const canView = group.isMember || group.canManage;

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <button onClick={() => router.push('/dashboard/groups')} className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1>Class of {group.year}</h1>
        {group.canManage && (
          <button className="btn btn-sm" onClick={openMembers}>Manage</button>
        )}
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Group header card */}
          <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 18, fontWeight: 800, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {group.imageUrl ? <img src={group.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : group.year.toString().slice(-2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{group.name}</div>
              <div className="text-muted text-sm">{group._count?.memberships ?? 0} members</div>
              {group.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#374151' }}>{group.description}</p>}
            </div>
          </div>

          {group.isRestricted && (
            <div className="alert" style={{ background: '#FFFBEB', color: '#D97706', marginBottom: 16, fontSize: 13 }}>
              Your posting access in this group is restricted by the group manager. You can view the feed but cannot post, comment, or like.
            </div>
          )}

          {!canView ? (
            <div className="empty-state card">
              <h3>Join to see this group's feed</h3>
              <p>You need to be an approved member of this group to view posts and interact with classmates.</p>
              <Link href="/dashboard/groups" className="btn btn-sm" style={{ marginTop: 12 }}>Back to Year Groups</Link>
            </div>
          ) : (
            <>
              {/* Composer */}
              {!group.isRestricted && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <textarea
                    className="textarea"
                    value={composerText}
                    onChange={e => setComposerText(e.target.value)}
                    placeholder={`Share something with Class of ${group.year}...`}
                    style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 70, width: '100%', marginBottom: 10 }}
                    maxLength={4000}
                  />
                  {composerImage && (
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <img src={composerImage.preview} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 260, objectFit: 'cover' }} />
                      <button onClick={() => setComposerImage(null)} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 0, cursor: 'pointer' }}>&times;</button>
                    </div>
                  )}
                  {showVideoInput && (
                    <div className="input-wrap" style={{ marginBottom: 10 }}>
                      <input type="url" value={composerVideoUrl} onChange={e => setComposerVideoUrl(e.target.value)} placeholder="Paste a YouTube, Vimeo, or video file link..." />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={pickImage} title="Add photo" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-50)', border: 0, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z M9 10a1 1 0 100-2 1 1 0 000 2z" /></svg>
                      </button>
                      <button type="button" onClick={() => setShowVideoInput(v => !v)} title="Add video link" style={{ width: 36, height: 36, borderRadius: 10, background: showVideoInput ? 'var(--blue-50)' : 'var(--bg)', border: 0, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImagePick} style={{ display: 'none' }} />
                    </div>
                    <button className="btn btn-sm" onClick={submitPost} disabled={posting || (!composerText.trim() && !composerImage && !composerVideoUrl.trim())}>
                      {posting ? <span className="spinner" /> : 'Post'}
                    </button>
                  </div>
                </div>
              )}

              {/* Feed */}
              {postsLoading ? (
                <div className="loading-center"><span className="spinner" /></div>
              ) : posts.length === 0 ? (
                <div className="empty-state card">
                  <h3>No posts yet</h3>
                  <p>Be the first to share something with your classmates!</p>
                </div>
              ) : (
                <div className="feed">
                  {posts.map(post => (
                    <div className="feed-card" key={post.id}>
                      <div className="feed-card-header">
                        <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                          {post.user.profile?.avatarUrl ? <img src={post.user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (post.user.profile?.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name">{post.user.profile?.fullName || 'A member'}</div>
                          <div className="time">{timeAgo(post.createdAt)} ago</div>
                        </div>
                        {(post.user.id === user?.id || group.canManage) && (
                          <button onClick={() => deletePost(post.id)} title="Delete post" style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                      {post.body && <div className="feed-card-body"><p style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p></div>}
                      {post.imageUrl && (
                        <div style={{ padding: '0 16px 12px' }}>
                          <img src={post.imageUrl} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 420, objectFit: 'cover' }} />
                        </div>
                      )}
                      {post.videoUrl && <div style={{ padding: '0 16px 12px' }}>{videoEmbed(post.videoUrl)}</div>}

                      <div className="feed-card-actions">
                        <button onClick={() => toggleLike(post)} disabled={group.isRestricted} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: post.likedByMe ? 'var(--blue-bright)' : 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: group.isRestricted ? 'default' : 'pointer' }}>
                          <svg fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-9.02a2 2 0 01-2-2v-6a2 2 0 012-2h1.523a2 2 0 001.789-1.106L12 4a2 2 0 012 2v4z" /></svg>
                          Like {post._count.likes > 0 && `(${post._count.likes})`}
                        </button>
                        <button onClick={() => toggleComments(post.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          Comment {post._count.comments > 0 && `(${post._count.comments})`}
                        </button>
                        <button onClick={() => sharePost(post.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 100 2.684m0-2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.999a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                          Share
                        </button>
                      </div>

                      {openComments.has(post.id) && (
                        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--border)' }}>
                          {commentsLoading.has(post.id) ? (
                            <div className="loading-center" style={{ padding: 12 }}><span className="spinner" /></div>
                          ) : (
                            <>
                              {(commentsByPost[post.id] || []).map(c => (
                                <div key={c.id} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                                    {c.user.profile?.avatarUrl ? <img src={c.user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (c.user.profile?.fullName || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 12, padding: '8px 12px' }}>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.user.profile?.fullName || 'A member'}</div>
                                    <div style={{ fontSize: 13, color: '#374151' }}>{c.body}</div>
                                  </div>
                                </div>
                              ))}
                              {!group.isRestricted && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                  <input
                                    type="text"
                                    value={commentInputs[post.id] || ''}
                                    onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') submitComment(post.id); }}
                                    placeholder="Write a comment..."
                                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 999, padding: '8px 14px', fontSize: 13, outline: 0 }}
                                  />
                                  <button className="btn btn-sm" onClick={() => submitComment(post.id)}>Send</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {hasMore && (
                    <button className="btn btn-sm" style={{ background: 'var(--muted)', alignSelf: 'center', margin: '0 auto' }} disabled={loadingMore} onClick={async () => {
                      setLoadingMore(true);
                      await loadPosts(posts[posts.length - 1]?.id);
                      setLoadingMore(false);
                    }}>
                      {loadingMore ? <span className="spinner" /> : 'Load more'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manage members modal */}
      {membersOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setMembersOpen(false)}>
          <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px' }}>Manage Members — {group.name}</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {membersLoading ? (
                <div className="loading-center"><span className="spinner" /></div>
              ) : members.length === 0 ? (
                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>No members yet.</p>
              ) : (
                members.map(m => (
                  <div key={m.id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                      {m.user.profile?.avatarUrl ? <img src={m.user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (m.user.profile?.fullName || m.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.user.profile?.fullName || m.user.email}
                        {m.userId === group.creatorId && <span className="badge badge-blue" style={{ fontSize: 10 }}>Manager</span>}
                        {m.banned && <span className="badge badge-red" style={{ fontSize: 10 }}>Banned</span>}
                        {m.restricted && !m.banned && <span className="badge badge-amber" style={{ fontSize: 10 }}>Restricted</span>}
                      </div>
                    </div>
                    {m.userId !== group.creatorId && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {m.banned ? (
                          <button className="btn btn-sm btn-success" onClick={() => moderate(m.userId, 'unban')} disabled={moderating === m.userId + 'unban'}>
                            {moderating === m.userId + 'unban' ? <span className="spinner" /> : 'Unban'}
                          </button>
                        ) : (
                          <>
                            <button className="btn btn-sm" style={{ background: m.restricted ? 'var(--muted)' : 'var(--amber)' }} onClick={() => moderate(m.userId, m.restricted ? 'unrestrict' : 'restrict')} disabled={moderating === m.userId + 'restrict' || moderating === m.userId + 'unrestrict'}>
                              {(moderating === m.userId + 'restrict' || moderating === m.userId + 'unrestrict') ? <span className="spinner" /> : (m.restricted ? 'Unrestrict' : 'Restrict')}
                            </button>
                            <button className="btn btn-sm" style={{ background: 'var(--red)' }} onClick={() => moderate(m.userId, 'ban')} disabled={moderating === m.userId + 'ban'}>
                              {moderating === m.userId + 'ban' ? <span className="spinner" /> : 'Ban'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <button className="btn" style={{ marginTop: 12, background: 'var(--muted)' }} onClick={() => setMembersOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
