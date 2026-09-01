'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import Avatar from '../../../components/Avatar';

interface YearGroup {
  id: string;
  year: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  creatorId?: string | null;
  pendingInvites?: number;
  _count: { memberships: number };
}

interface AlumniResult {
  userId: string;
  fullName: string;
  graduationYear: number;
  avatarUrl?: string | null;
}

interface Invite {
  id: string;
  status: string;
  selfRequested: boolean;
  awaitingRegistration?: boolean;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: string;
  invitedUser?: { email: string; profile?: { fullName?: string | null; avatarUrl?: string | null; graduationYear?: number | null } | null } | null;
  invitedBy: { email: string; profile?: { fullName?: string | null } | null };
}

type RequestState = 'none' | 'pending' | 'joined';

export default function YearGroupsPage() {
  const { user, refresh, isAdmin } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<YearGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [galleryTargetId, setGalleryTargetId] = useState<string | null>(null);
  const [uploadingGalleryId, setUploadingGalleryId] = useState<string | null>(null);
  const [galleryOpenId, setGalleryOpenId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ year: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [editGroup, setEditGroup] = useState<YearGroup | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const [inviteModalGroup, setInviteModalGroup] = useState<YearGroup | null>(null);
  const [inviteMode, setInviteMode] = useState<'search' | 'contact'>('search');
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState<AlumniResult[]>([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ fullName: '', email: '', phone: '' });
  const [sendingContactInvite, setSendingContactInvite] = useState(false);
  const [contactInviteResult, setContactInviteResult] = useState<{ inviteLink: string; emailSent: boolean } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [invitesModalGroup, setInvitesModalGroup] = useState<YearGroup | null>(null);
  const [invitesList, setInvitesList] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesActing, setInvitesActing] = useState<string | null>(null);

  const load = useCallback(() => {
    // Admins see all groups; regular users see only their joined groups
    const url = isAdmin ? '/year-groups' : '/year-groups?mine=true';
    apiGet<YearGroup[]>(url)
      .then(setGroups)
      .catch(() => setError('Failed to load year groups'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(load, [load]);

  const joinedIds = new Set(user?.memberships?.map(m => m.yearGroupId) || []);
  const canManage = (yg: YearGroup) => isAdmin || yg.creatorId === user?.id;

  // ===== Search year groups =====
  const onSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchActive(true);
    try {
      const results = await apiGet<YearGroup[]>(`/year-groups?search=${encodeURIComponent(q)}`);
      setSearchResults(results);
      // If exactly one result and the user has joined it, navigate directly
      if (results.length === 1 && joinedIds.has(results[0].id)) {
        router.push(`/dashboard/groups/${results[0].id}`);
      }
    } catch { setSearchResults([]); } finally { setSearching(false); }
  };

  // Live search as user types (debounced)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchActive(false); setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearchActive(true);
      setSearching(true);
      apiGet<YearGroup[]>(`/year-groups?search=${encodeURIComponent(q)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
    setSearchResults([]);
  };

  // ===== Create =====
  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(createForm.year, 10);
    if (!year || year < 1960 || year > 2030) { setError('Please enter a valid year between 1960 and 2030'); return; }
    if (!createForm.name.trim()) { setError('Please enter a group name'); return; }
    setCreating(true);
    setError('');
    try {
      const result = await apiPost<YearGroup>('/year-groups', {
        year, name: createForm.name.trim(), description: createForm.description.trim() || undefined,
      });
      if (result && (result as any).error) {
        setError((result as any).error);
      } else {
        setSuccess('Year group created! You are its manager and can invite classmates.');
        setCreateForm({ year: '', name: '', description: '' });
        setShowCreate(false);
        setTimeout(() => setSuccess(''), 5000);
        load();
        refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create year group');
    } finally {
      setCreating(false);
    }
  };

  // ===== Request to join =====
  const requestJoin = async (id: string) => {
    setRequesting(id);
    setError('');
    try {
      await apiPost(`/year-groups/${id}/request-join`);
      setSuccess('Request sent! An admin or the group manager will review it.');
      setTimeout(() => setSuccess(''), 5000);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setRequesting(null);
    }
  };

  // ===== Edit group (name, description, photo) =====
  const openEditModal = (yg: YearGroup) => { setEditGroup(yg); setEditForm({ name: yg.name, description: yg.description || '' }); };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    if (!editForm.name.trim()) { setError('Group name is required'); return; }
    setSavingEdit(true);
    setError('');
    try {
      const updated = await apiPatch<YearGroup>(`/year-groups/${editGroup.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
      setGroups(prev => prev.map(g => g.id === editGroup.id ? { ...g, ...updated } : g));
      setSuccess('Year group updated!');
      setTimeout(() => setSuccess(''), 4000);
      setEditGroup(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update year group');
    } finally {
      setSavingEdit(false);
    }
  };
  const onEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editGroup) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setError('');
    setUploadingId(editGroup.id);
    try {
      const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/year-groups/${editGroup.id}/image`, file);
      setGroups(prev => prev.map(g => g.id === editGroup.id ? { ...g, imageUrl } : g));
      setEditGroup(prev => prev ? { ...prev, imageUrl } : prev);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploadingId(null);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
    }
  };

  // ===== Gallery upload =====
  const pickGalleryImage = (id: string) => { setGalleryTargetId(id); galleryInputRef.current?.click(); };
  const onGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !galleryTargetId) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setError('');
    setUploadingGalleryId(galleryTargetId);
    try {
      const { galleryUrls } = await apiUpload<{ imageUrl: string; galleryUrls: string[] }>(`/year-groups/${galleryTargetId}/gallery`, file);
      setGroups(prev => prev.map(g => g.id === galleryTargetId ? { ...g, galleryUrls } : g));
    } catch (err: any) {
      setError(err.message || 'Gallery upload failed');
    } finally {
      setUploadingGalleryId(null);
      setGalleryTargetId(null);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };
  const removeGalleryPhoto = async (groupId: string, url: string) => {
    try {
      const { galleryUrls } = await apiDelete<{ galleryUrls: string[] }>(`/year-groups/${groupId}/gallery`, { url });
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, galleryUrls } : g));
    } catch (err: any) {
      setError(err.message || 'Failed to remove photo');
    }
  };

  // ===== Invite flow =====
  const openInviteModal = (yg: YearGroup) => { setInviteModalGroup(yg); setInviteMode('search'); setInviteSearch(''); setInviteResults([]); setContactForm({ fullName: '', email: '', phone: '' }); setContactInviteResult(null); };
  const searchAlumni = async (q: string) => {
    setInviteSearch(q);
    if (q.trim().length < 2) { setInviteResults([]); return; }
    setInviteSearching(true);
    try {
      const results = await apiGet<AlumniResult[]>(`/alumni?search=${encodeURIComponent(q.trim())}`);
      setInviteResults(results);
    } catch { setInviteResults([]); } finally { setInviteSearching(false); }
  };
  const sendInvite = async (userId: string) => {
    if (!inviteModalGroup) return;
    setInvitingUserId(userId);
    setError('');
    try {
      const isAdminInviter = isAdmin;
      await apiPost(`/year-groups/${inviteModalGroup.id}/invite`, { userId });
      setSuccess(isAdminInviter ? 'Member added to the group.' : 'Invite sent — waiting for admin approval.');
      setTimeout(() => setSuccess(''), 5000);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInvitingUserId(null);
    }
  };

  const sendContactInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModalGroup) return;
    if (!contactForm.email.trim() && !contactForm.phone.trim()) { setError('Please provide an email or phone number'); return; }
    setSendingContactInvite(true);
    setError('');
    setContactInviteResult(null);
    try {
      const result = await apiPost<any>(`/year-groups/${inviteModalGroup.id}/invite`, {
        fullName: contactForm.fullName.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
      });
      if (result.linkSent === false) {
        setSuccess('This person already has an account — added to the invite list.');
        setContactForm({ fullName: '', email: '', phone: '' });
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setContactInviteResult({ inviteLink: result.inviteLink, emailSent: result.emailSent });
      }
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setSendingContactInvite(false);
    }
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard?.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  // ===== Manage invites (creator/admin) =====
  const openInvitesModal = async (yg: YearGroup) => {
    setInvitesModalGroup(yg);
    setInvitesLoading(true);
    try {
      const list = await apiGet<Invite[]>(`/year-groups/${yg.id}/invites`);
      setInvitesList(list);
    } catch { setInvitesList([]); } finally { setInvitesLoading(false); }
  };
  const actOnInvite = async (inviteId: string, action: 'approve' | 'reject') => {
    setInvitesActing(inviteId);
    try {
      await apiPost(`/year-group-invites/${inviteId}/${action}`);
      setInvitesList(prev => prev.map(i => i.id === inviteId ? { ...i, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : i));
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to update invite');
    } finally {
      setInvitesActing(null);
    }
  };

  const galleryGroup = groups.find(g => g.id === galleryOpenId);

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Year Groups</h1>
        {!showCreate && (
          <button className="btn btn-sm" onClick={() => setShowCreate(true)}>+ Create</button>
        )}
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="alert" style={{ background: 'var(--blue-50)', color: 'var(--blue)', marginBottom: 16, fontSize: 13 }}>
            {isAdmin
              ? 'Year groups are invite-only. Group creators and admins can invite classmates directly. You can see all year groups.'
              : 'These are the year groups you\'ve joined. Use the search bar above to find other classes and request to join.'}
          </div>

          {/* Search bar */}
          <form onSubmit={onSearchSubmit} className="input-wrap" style={{ marginBottom: 16 }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setSearchActive(false); setSearchResults([]); } }}
              placeholder="Search year groups by year or name..."
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </form>

          {/* Search results */}
          {searchActive ? (
            searching ? (
              <div className="loading-center"><span className="spinner" /></div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state card">
                <h3>No year groups found</h3>
                <p>No groups match "{searchQuery}". Try a different year or name.</p>
                <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={clearSearch}>Clear search</button>
              </div>
            ) : (
              <div className="feed">
                <div className="text-muted text-sm" style={{ marginBottom: 12 }}>Found {searchResults.length} group{searchResults.length !== 1 ? 's' : ''} — click a joined group to open its feed, or request to join a new one.</div>
                {searchResults.map(yg => {
                  const joined = joinedIds.has(yg.id);
                  const manage = canManage(yg);
                  return (
                    <div className="feed-card" key={yg.id}>
                      <div className="feed-card-header">
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 16, fontWeight: 800, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {yg.imageUrl ? <img src={yg.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (yg.year?.toString() ?? '—').slice(-2)}
                        </div>
                        {(joined || manage) ? (
                          <Link href={`/dashboard/groups/${yg.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                            <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Class of {yg.year}
                              {manage && <span className="badge badge-blue" style={{ fontSize: 10 }}>Manager</span>}
                            </div>
                            <div className="time">{yg.name} · {yg._count?.memberships ?? 0} members</div>
                          </Link>
                        ) : (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="name">Class of {yg.year}</div>
                            <div className="time">{yg.name} · {yg._count?.memberships ?? 0} members</div>
                          </div>
                        )}
                        {joined ? (
                          <span className="badge badge-green">✓ Joined</span>
                        ) : (
                          <RequestButton yg={yg} onRequest={() => requestJoin(yg.id)} loading={requesting === yg.id} />
                        )}
                      </div>
                      {yg.description && <div className="feed-card-body"><p>{yg.description}</p></div>}
                    </div>
                  );
                })}
                <button className="btn btn-sm" style={{ marginTop: 12, background: 'var(--muted)', alignSelf: 'center' }} onClick={clearSearch}>Back to my groups</button>
              </div>
            )
          ) : showCreate ? (
            <form onSubmit={createGroup} className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create Year Group</h3>
              <div className="form-group">
                <label>Graduation Year</label>
                <div className="input-wrap">
                  <input type="number" value={createForm.year} onChange={e => setCreateForm({ ...createForm, year: e.target.value })} placeholder="e.g. 2012" min={1960} max={2030} required />
                </div>
              </div>
              <div className="form-group">
                <label>Group Name</label>
                <div className="input-wrap">
                  <input type="text" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Ofori Panin Senior High School Class of 2012" maxLength={100} required />
                </div>
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea className="textarea" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Add a description for your year group..." maxLength={500} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="submit" disabled={creating}>
                  {creating ? <span className="spinner" /> : 'Create Group'}
                </button>
                <button className="btn" type="button" style={{ background: 'var(--muted)' }} onClick={() => { setShowCreate(false); setCreateForm({ year: '', name: '', description: '' }); setError(''); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {!searchActive && (loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : groups.length === 0 ? (
            <div className="empty-state">
              <h3>{isAdmin ? 'No year groups yet' : "You haven't joined a year group yet"}</h3>
              <p>{isAdmin ? 'Be the first to create a year group for your class!' : 'Search for your graduating class above to find and request to join your year group.'}</p>
              {isAdmin && !showCreate && <button className="btn" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>+ Create Year Group</button>}
            </div>
          ) : (
            <div className="feed">
              {!isAdmin && <h3 style={{ fontSize: 15, margin: '0 0 12px', color: 'var(--muted)' }}>My Year Groups</h3>}
              {groups.map(yg => {
                const joined = joinedIds.has(yg.id);
                const manage = canManage(yg);
                const gallery = yg.galleryUrls || [];
                return (
                  <div className="feed-card" key={yg.id}>
                    <div className="feed-card-header">
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 16, fontWeight: 800, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {yg.imageUrl ? <img src={yg.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (yg.year?.toString() ?? '—').slice(-2)}
                        </div>
                        {manage && (
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(yg); }} style={{
                            position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--blue-bright)', border: '2px solid var(--white)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
                          }} title="Edit group photo">
                            {uploadingId === yg.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            )}
                          </button>
                        )}
                      </div>
                      {(joined || manage) ? (
                        <Link href={`/dashboard/groups/${yg.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                          <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Class of {yg.year}
                            {manage && <span className="badge badge-blue" style={{ fontSize: 10 }}>Manager</span>}
                          </div>
                          <div className="time">{yg.name} · {yg._count?.memberships ?? 0} members</div>
                        </Link>
                      ) : (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Class of {yg.year}
                          </div>
                          <div className="time">{yg.name} · {yg._count?.memberships ?? 0} members</div>
                        </div>
                      )}
                      {joined ? (
                        <span className="badge badge-green">✓ Joined</span>
                      ) : (
                        <RequestButton yg={yg} onRequest={() => requestJoin(yg.id)} loading={requesting === yg.id} />
                      )}
                    </div>
                    {yg.description && (
                      <div className="feed-card-body">
                        <p>{yg.description}</p>
                      </div>
                    )}

                    {/* Gallery preview strip */}
                    {(gallery.length > 0 || manage) && (
                      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
                        {gallery.slice(0, 5).map((url, i) => (
                          <img key={i} src={url} alt="" onClick={() => setGalleryOpenId(yg.id)} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} />
                        ))}
                        {gallery.length > 5 && (
                          <button onClick={() => setGalleryOpenId(yg.id)} style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: 'var(--blue-50)', color: 'var(--blue)', border: 0, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            +{gallery.length - 5}
                          </button>
                        )}
                        {manage && (
                          <button onClick={() => pickGalleryImage(yg.id)} disabled={uploadingGalleryId === yg.id} style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: 'var(--bg)', border: '1.5px dashed var(--border)', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Add gallery photo">
                            {uploadingGalleryId === yg.id ? <span className="spinner" /> : '+'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Feed + Chat links for joined non-managers */}
                    {joined && !manage && (
                      <div className="feed-card-actions">
                        <Link href={`/dashboard/groups/${yg.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          Feed
                        </Link>
                        <Link href={`/dashboard/groups/${yg.id}?tab=chat`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          Chat
                        </Link>
                      </div>
                    )}

                    {/* Manager actions */}
                    {manage && (
                      <div className="feed-card-actions">
                        <Link href={`/dashboard/groups/${yg.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          Feed
                        </Link>
                        <Link href={`/dashboard/groups/${yg.id}?tab=chat`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          Chat
                        </Link>
                        <button onClick={() => openEditModal(yg)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit
                        </button>
                        <button onClick={() => openInviteModal(yg)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-3a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          Invite
                        </button>
                        <button onClick={() => openInvitesModal(yg)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer', position: 'relative' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Requests
                          {(yg.pendingInvites ?? 0) > 0 && <span className="badge badge-red" style={{ fontSize: 10, marginLeft: 2 }}>{yg.pendingInvites}</span>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onGalleryChange} style={{ display: 'none' }} />

      {/* Edit group modal */}
      {editGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditGroup(null)}>
          <form onSubmit={saveEdit} className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Edit Year Group</h3>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 26, fontWeight: 800, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editGroup.imageUrl ? <img src={editGroup.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (editGroup.year?.toString() ?? '—').slice(-2)}
                </div>
                <button type="button" onClick={() => editImageInputRef.current?.click()} disabled={uploadingId === editGroup.id} style={{
                  position: 'absolute', bottom: -2, right: -2, width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--blue-bright)', border: '3px solid var(--white)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }} title="Change group photo">
                  {uploadingId === editGroup.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
                <input ref={editImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onEditImageChange} style={{ display: 'none' }} />
              </div>
              <div className="hint" style={{ marginTop: 8 }}>Tap the icon to upload or change the group photo</div>
            </div>

            <div className="form-group">
              <label>Group Name</label>
              <div className="input-wrap">
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} maxLength={100} required />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Add a description for your year group..." maxLength={500} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={savingEdit}>
                {savingEdit ? <span className="spinner" /> : 'Save Changes'}
              </button>
              <button className="btn" type="button" style={{ background: 'var(--muted)' }} onClick={() => setEditGroup(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gallery viewer modal */}
      {galleryGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', flexDirection: 'column' }} onClick={() => setGalleryOpenId(null)}>
          <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>{galleryGroup.name} — Gallery</span>
            <button onClick={() => setGalleryOpenId(null)} style={{ background: 'none', border: 0, color: 'white', fontSize: 24, cursor: 'pointer' }}>&times;</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }} onClick={e => e.stopPropagation()}>
            {(galleryGroup.galleryUrls || []).map((url, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                {canManage(galleryGroup) && (
                  <button onClick={() => removeGalleryPhoto(galleryGroup.id, url)} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 0, cursor: 'pointer', fontSize: 14 }}>&times;</button>
                )}
              </div>
            ))}
            {(galleryGroup.galleryUrls || []).length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.7)', gridColumn: '1/-1', textAlign: 'center' }}>No photos yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteModalGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setInviteModalGroup(null)}>
          <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px' }}>Invite to {inviteModalGroup.name}</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button className={`btn btn-sm ${inviteMode === 'search' ? '' : 'btn-outline'}`} onClick={() => { setInviteMode('search'); setContactInviteResult(null); }}>On the app</button>
              <button className={`btn btn-sm ${inviteMode === 'contact' ? '' : 'btn-outline'}`} onClick={() => { setInviteMode('contact'); setContactInviteResult(null); }}>By phone / email</button>
            </div>

            {inviteMode === 'search' ? (
              <>
                <div className="input-wrap" style={{ marginBottom: 12 }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" value={inviteSearch} onChange={e => searchAlumni(e.target.value)} placeholder="Search alumni by name..." autoFocus />
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {inviteSearching ? (
                    <div className="loading-center"><span className="spinner" /></div>
                  ) : inviteResults.length === 0 && inviteSearch.trim().length >= 2 ? (
                    <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>No alumni found. If they aren't on OPASS CONNECT yet, use "By phone / email" instead.</p>
                  ) : (
                    inviteResults.map(a => (
                      <div key={a.userId} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                        <Avatar src={a.avatarUrl} name={a.fullName} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{a.fullName}</div>
                          <div className="text-muted text-sm">Class of {a.graduationYear}</div>
                        </div>
                        <button className="btn btn-sm" onClick={() => sendInvite(a.userId)} disabled={invitingUserId === a.userId}>
                          {invitingUserId === a.userId ? <span className="spinner" /> : 'Invite'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : contactInviteResult ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  {contactInviteResult.emailSent ? 'Invite email sent!' : 'Invite created.'} Share this link so they can register and join automatically:
                </div>
                <div className="input-wrap" style={{ marginBottom: 12 }}>
                  <input type="text" readOnly value={contactInviteResult.inviteLink} style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button className="btn btn-sm" type="button" onClick={() => copyInviteLink(contactInviteResult.inviteLink)}>
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a className="btn btn-sm btn-outline" href={`sms:?&body=${encodeURIComponent(`Join OPASS CONNECT: ${contactInviteResult.inviteLink}`)}`}>Share via SMS</a>
                  <a className="btn btn-sm btn-outline" href={`https://wa.me/?text=${encodeURIComponent(`Join OPASS CONNECT: ${contactInviteResult.inviteLink}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </div>
                <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => { setContactInviteResult(null); setContactForm({ fullName: '', email: '', phone: '' }); }}>Invite another</button>
              </div>
            ) : (
              <form onSubmit={sendContactInvite} style={{ flex: 1, overflowY: 'auto' }}>
                <p className="text-muted text-sm" style={{ marginTop: 0, marginBottom: 14 }}>
                  Not on OPASS CONNECT yet? Send them a registration link by email or phone. Once they sign up, they'll automatically join this group's request queue.
                </p>
                <div className="form-group">
                  <label>Full name (optional)</label>
                  <div className="input-wrap">
                    <input type="text" value={contactForm.fullName} onChange={e => setContactForm({ ...contactForm, fullName: e.target.value })} placeholder="e.g. Kwame Mensah" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrap">
                    <input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="their@email.com" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone number</label>
                  <div className="input-wrap">
                    <input type="tel" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="+233 XX XXX XXXX" />
                  </div>
                  <div className="hint">Provide at least an email or a phone number. We'll generate a link you can send via SMS/WhatsApp if no email is given.</div>
                </div>
                <button className="btn btn-block" type="submit" disabled={sendingContactInvite}>
                  {sendingContactInvite ? <span className="spinner" /> : 'Send Invite'}
                </button>
              </form>
            )}

            <button className="btn" style={{ marginTop: 12, background: 'var(--muted)' }} onClick={() => setInviteModalGroup(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Manage requests modal */}
      {invitesModalGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setInvitesModalGroup(null)}>
          <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px' }}>Requests — {invitesModalGroup.name}</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {invitesLoading ? (
                <div className="loading-center"><span className="spinner" /></div>
              ) : invitesList.length === 0 ? (
                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>No invite requests yet.</p>
              ) : (
                invitesList.map(inv => (
                  <div key={inv.id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                    <Avatar src={inv.invitedUser?.profile?.avatarUrl} name={inv.invitedUser?.profile?.fullName || inv.invitedUser?.email || inv.contactEmail || inv.contactPhone} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.invitedUser?.profile?.fullName || inv.invitedUser?.email || inv.contactEmail || inv.contactPhone || 'Pending contact'}</div>
                      <div className="text-muted text-sm">
                        {inv.awaitingRegistration ? 'Invited — awaiting sign up' : inv.selfRequested ? 'Requested to join' : `Invited by ${inv.invitedBy.profile?.fullName || inv.invitedBy.email}`}
                      </div>
                    </div>
                    {inv.awaitingRegistration ? (
                      <span className="badge badge-amber">Awaiting sign up</span>
                    ) : inv.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-success" onClick={() => actOnInvite(inv.id, 'approve')} disabled={invitesActing === inv.id}>
                          {invitesActing === inv.id ? <span className="spinner" /> : 'Approve'}
                        </button>
                        <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => actOnInvite(inv.id, 'reject')} disabled={invitesActing === inv.id}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`badge ${inv.status === 'APPROVED' ? 'badge-green' : 'badge-red'}`}>{inv.status}</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <button className="btn" style={{ marginTop: 12, background: 'var(--muted)' }} onClick={() => setInvitesModalGroup(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestButton({ yg, onRequest, loading }: { yg: YearGroup; onRequest: () => void; loading: boolean }) {
  const [sent, setSent] = useState(false);
  if (sent) return <span className="badge badge-amber">Pending</span>;
  return (
    <button className="btn btn-sm" onClick={() => { setSent(true); onRequest(); }} disabled={loading}>
      {loading ? <span className="spinner" /> : 'Request to Join'}
    </button>
  );
}
