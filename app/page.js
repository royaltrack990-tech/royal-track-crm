'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ===== CONFIGURATION =====
   ⚠️ TO CHANGE MASTER PASSWORD: Update the value below.
   Sirf yeh password jaante hain Royal Track team ke log.
   Without this password, koi bhi CRM access nahi kar sakta.
============================================== */
const MASTER_PASSWORD = 'royaltrack2026';

/* ===== CONSTANTS =====
   accessLevel: 'admin' = sees everything across the team
   accessLevel: 'sales' = sees only leads they created OR were assigned to them
============================================== */
const USERS = [
  { name: 'Mr. Nouman',          role: 'Admin',            accessLevel: 'admin' },
  { name: 'Mr. Husham',          role: 'CEO',              accessLevel: 'admin' },
  { name: 'Mr. Bilal',           role: 'Manager',          accessLevel: 'admin' },
  { name: 'Mr. Zafar',           role: 'Sales Operations', accessLevel: 'admin' },
  { name: 'Mr. Mohammad Yousaf', role: 'Sales Executive',  accessLevel: 'sales' },
];

// Helpers for role-based access
const getUserAccess = (name) => USERS.find(u => u.name === name)?.accessLevel || 'sales';
const isAdminUser = (name) => getUserAccess(name) === 'admin';
const canViewLead = (lead, userName) => {
  if (isAdminUser(userName)) return true;
  return lead.createdBy === userName || lead.assignedTo === userName;
};

const STAGES = [
  { id: 'new', name: 'New Inquiry', color: '#2563eb' },
  { id: 'contacted', name: 'Contacted', color: '#7c3aed' },
  { id: 'meeting', name: 'Site Visit', color: '#ec4899' },
  { id: 'proposal', name: 'Proposal Sent', color: '#d97706' },
  { id: 'negotiation', name: 'Negotiation', color: '#0d9488' },
  { id: 'won', name: 'Won', color: '#2d8659' },
  { id: 'lost', name: 'Lost', color: '#6b7280' },
];

const SOURCES = [
  'Facebook Ads', 'Instagram', 'Google Ads', 'Website',
  'Referral', 'Walk-in', 'WhatsApp', 'Other'
];

const ACTIVITY_TYPES = [
  { id: 'call', icon: '📞', label: 'Call' },
  { id: 'note', icon: '📝', label: 'Note' },
  { id: 'meeting', icon: '🤝', label: 'Site Visit' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
  { id: 'email', icon: '✉️', label: 'Email' },
];

/* ===== UTILITY FUNCTIONS ===== */
const uid = () => 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const actId = () => 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const initials = (name) => {
  if (!name) return '?';
  // Strip honorifics (Mr./Mrs./Ms./Dr.) for clean initials
  const cleaned = name.replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map(s => s[0]).join('').slice(0, 2).toUpperCase();
};

const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const relativeTime = (ts) => {
  if (!ts) return 'never';
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const days = Math.floor(hr / 24);
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  if (months < 12) return months + 'mo ago';
  return Math.floor(months / 12) + 'y ago';
};

const daysSince = (ts) => {
  if (!ts) return Infinity;
  return Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24));
};

const formatAED = (n) => {
  if (!n || isNaN(n)) return '';
  return 'AED ' + Number(n).toLocaleString('en-US');
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileTypeInfo = (file) => {
  const type = file.type || '';
  const name = file.name || '';
  const ext = (name.split('.').pop() || '').toUpperCase();

  if (type.startsWith('image/')) return { kind: 'image', ext, badge: '' };
  if (type === 'application/pdf' || ext === 'PDF') return { kind: 'file', ext: 'PDF', badge: 'pdf' };
  if (type.includes('word') || ext === 'DOC' || ext === 'DOCX') return { kind: 'file', ext: 'DOC', badge: 'doc' };
  if (type.includes('sheet') || type.includes('excel') || ext === 'XLS' || ext === 'XLSX' || ext === 'CSV') return { kind: 'file', ext: 'XLS', badge: 'xls' };
  return { kind: 'file', ext: ext.slice(0, 4) || 'FILE', badge: '' };
};

const getStage = (id) => STAGES.find(s => s.id === id) || STAGES[0];

const lastActivityTime = (lead) => {
  if (!lead) return null;
  if (lead.activities && lead.activities.length) {
    return lead.activities[lead.activities.length - 1].timestamp;
  }
  return lead.createdAt;
};

// Convert URLs in text to clickable links
// Detects http(s) URLs and www. URLs, returns array of strings and <a> elements
function linkify(text) {
  if (!text) return text;
  const urlRegex = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part && part.match(/^(https?:\/\/|www\.)/i)) {
      // Strip trailing punctuation that's usually not part of the URL
      const trailingPunct = part.match(/[.,;:!?)]+$/);
      const cleanUrl = trailingPunct ? part.slice(0, -trailingPunct[0].length) : part;
      const href = cleanUrl.startsWith('www.') ? 'https://' + cleanUrl : cleanUrl;
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
            onClick={(e) => e.stopPropagation()}
          >{cleanUrl}</a>
          {trailingPunct ? trailingPunct[0] : ''}
        </span>
      );
    }
    return part;
  });
}

/* ===== MAIN COMPONENT ===== */
export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'error'
  const [topView, setTopView] = useState('pipeline'); // 'pipeline' | 'dashboard'
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [leadModal, setLeadModal] = useState({ open: false, editingId: null });
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [newActivityType, setNewActivityType] = useState('call');
  const [newActivityText, setNewActivityText] = useState('');
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadingFile, setUploadingFile] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const saveTimerRef = useRef(null);
  const skipSaveRef = useRef(true); // skip first save on initial load

  // ===== STORAGE =====
  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setSyncStatus('syncing');
    try {
      const res = await fetch('/api/leads', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      skipSaveRef.current = true;
      setLeads(data.leads || []);
      setSyncStatus('idle');
    } catch (err) {
      console.error('Fetch error:', err);
      setSyncStatus('error');
      if (!silent) showToast('Could not sync data', true);
    }
  }, []);

  const saveLeads = useCallback(async (leadsToSave) => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToSave }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSyncStatus('idle');
    } catch (err) {
      console.error('Save error:', err);
      setSyncStatus('error');
      showToast('Could not save — please try again', true);
    }
  }, []);

  // Initial load + restore user session + check master password
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check master password (saved permanently in localStorage)
      const authed = localStorage.getItem('rt_authenticated') === 'true';
      setIsAuthenticated(authed);

      // Restore current user session
      const savedUser = sessionStorage.getItem('rt_current_user');
      if (savedUser && USERS.find(u => u.name === savedUser)) {
        setCurrentUser(savedUser);
      }
    }
    setAuthChecked(true);
    fetchLeads().finally(() => setLoading(false));
  }, [fetchLeads]);

  // Auto-save (debounced) whenever leads change
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveLeads(leads);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [leads, saveLeads]);

  // Refresh on tab focus (so other users' changes show up)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        fetchLeads(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentUser, fetchLeads]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setLeadModal({ open: false, editingId: null });
        setDetailLeadId(null);
      }
      if (e.key === 'n' && (e.ctrlKey || e.metaKey) && currentUser && !leadModal.open) {
        e.preventDefault();
        openLeadModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentUser, leadModal.open]);

  // ===== HELPERS =====
  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 2400);
  };

  const handleMasterPassword = (e) => {
    if (e) e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) {
      localStorage.setItem('rt_authenticated', 'true');
      setIsAuthenticated(true);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleLogin = (userName) => {
    sessionStorage.setItem('rt_current_user', userName);
    setCurrentUser(userName);
    fetchLeads();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rt_current_user');
    setCurrentUser(null);
  };

  const handleFullLogout = () => {
    if (!confirm('Full logout will require master password next time. Continue?')) return;
    sessionStorage.removeItem('rt_current_user');
    localStorage.removeItem('rt_authenticated');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const openLeadModal = (leadId = null) => {
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      setFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        location: lead.location || '',
        source: lead.source || '',
        lookingFor: lead.lookingFor || '',
        value: lead.value || '',
        assignedTo: lead.assignedTo || currentUser,
        stage: lead.stage || 'new',
      });
    } else {
      setFormData({
        name: '', phone: '', email: '', location: '',
        source: '', lookingFor: '', value: '',
        assignedTo: currentUser, stage: 'new',
      });
    }
    setLeadModal({ open: true, editingId: leadId });
  };

  const saveLead = () => {
    const name = (formData.name || '').trim();
    if (!name) {
      showToast('Client name is required', true);
      return;
    }

    const payload = {
      name,
      phone: (formData.phone || '').trim(),
      email: (formData.email || '').trim(),
      location: (formData.location || '').trim(),
      source: formData.source || '',
      lookingFor: (formData.lookingFor || '').trim(),
      value: parseFloat(formData.value) || 0,
      assignedTo: formData.assignedTo || currentUser,
      stage: formData.stage || 'new',
      updatedAt: Date.now(),
    };

    if (leadModal.editingId) {
      setLeads(prev => prev.map(l => {
        if (l.id !== leadModal.editingId) return l;
        const stageChanged = l.stage !== payload.stage;
        const oldStage = l.stage;
        const updated = { ...l, ...payload };
        if (stageChanged) {
          updated.activities = [
            ...(l.activities || []),
            {
              id: actId(),
              type: 'stage',
              content: `Stage changed from "${getStage(oldStage).name}" to "${getStage(payload.stage).name}"`,
              user: currentUser,
              timestamp: Date.now(),
            }
          ];
        }
        return updated;
      }));
      showToast('Lead updated');
    } else {
      const newLead = {
        id: uid(),
        ...payload,
        createdBy: currentUser,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        activities: [{
          id: actId(),
          type: 'stage',
          content: `Lead created by ${currentUser}`,
          user: currentUser,
          timestamp: Date.now(),
        }],
      };
      // Prepend new lead to the start of the array — combined with sort, ensures it always shows at top
      setLeads(prev => [newLead, ...prev]);
      showToast('Lead added');
    }

    setLeadModal({ open: false, editingId: null });
  };

  const addActivity = (leadId) => {
    const text = newActivityText.trim();
    if (!text) {
      showToast('Please add some details', true);
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        activities: [
          ...(l.activities || []),
          {
            id: actId(),
            type: newActivityType,
            content: text,
            user: currentUser,
            timestamp: Date.now(),
          },
        ],
      };
    }));
    setNewActivityText('');
    showToast(newActivityType.charAt(0).toUpperCase() + newActivityType.slice(1) + ' logged');
  };

  const changeStage = (leadId, newStageId) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId || l.stage === newStageId) return l;
      const oldStage = l.stage;
      return {
        ...l,
        stage: newStageId,
        updatedAt: Date.now(),
        activities: [
          ...(l.activities || []),
          {
            id: actId(),
            type: 'stage',
            content: `Stage changed from "${getStage(oldStage).name}" to "${getStage(newStageId).name}"`,
            user: currentUser,
            timestamp: Date.now(),
          },
        ],
      };
    }));
    showToast(`Moved to ${getStage(newStageId).name}`);
  };

  const deleteLead = (leadId) => {
    if (!confirm('Delete this lead permanently? This cannot be undone.')) return;
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setDetailLeadId(null);
    showToast('Lead deleted');
  };

  // ===== FILE UPLOAD =====
  const handleFileUpload = async (leadId, fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      // Quick client-side size check (server enforces 25MB)
      if (file.size > 25 * 1024 * 1024) {
        showToast(`${file.name} is too large (max 25 MB)`, true);
        continue;
      }

      setUploadingFile(file.name);
      try {
        // Dynamic import — only loads on client
        const { upload } = await import('@vercel/blob/client');
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });

        const attachment = {
          id: 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          url: blob.url,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedBy: currentUser,
          uploadedAt: Date.now(),
        };

        setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
            ...l,
            updatedAt: Date.now(),
            attachments: [...(l.attachments || []), attachment],
            activities: [
              ...(l.activities || []),
              {
                id: actId(),
                type: 'file',
                content: `Uploaded file: ${file.name}`,
                user: currentUser,
                timestamp: Date.now(),
              },
            ],
          };
        }));
        showToast(`${file.name} uploaded`);
      } catch (error) {
        console.error('Upload error:', error);
        showToast(`Upload failed: ${error.message || 'unknown error'}`, true);
      } finally {
        setUploadingFile(null);
      }
    }
  };

  const deleteAttachment = async (leadId, attachmentId) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const attachment = (lead.attachments || []).find(a => a.id === attachmentId);
    if (!attachment) return;
    if (!confirm(`Delete "${attachment.name}"?`)) return;

    // Remove from blob storage (fire and forget — if it fails, file becomes orphaned but it's OK)
    fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: attachment.url }),
    }).catch(err => console.warn('Blob delete failed:', err));

    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        attachments: (l.attachments || []).filter(a => a.id !== attachmentId),
      };
    }));
    showToast('File deleted');
  };

  // ===== DELETE ACTIVITY =====
  const deleteActivity = (leadId, activityId) => {
    if (!confirm('Delete this activity entry? This cannot be undone.')) return;
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        activities: (l.activities || []).filter(a => a.id !== activityId),
      };
    }));
    showToast('Activity deleted');
  };

  // ===== BULK IMPORT FROM EXCEL =====
  const importLeads = (newLeads) => {
    if (!newLeads || newLeads.length === 0) return;
    setLeads(prev => [...newLeads, ...prev]);
    showToast(`Successfully imported ${newLeads.length} leads`);
    setImportModalOpen(false);
  };

  // ===== FILTERING =====
  const getFilteredLeads = () => {
    // 1. ROLE-BASED ACCESS — sales users only see their own/assigned leads.
    //    Admin users see everything.
    let result = leads.filter(l => canViewLead(l, currentUser));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.location || '').toLowerCase().includes(q) ||
        (l.lookingFor || '').toLowerCase().includes(q)
      );
    }
    if (filterUser !== 'all') result = result.filter(l => l.assignedTo === filterUser);
    if (filterSource !== 'all') result = result.filter(l => l.source === filterSource);

    // Date range filter — applied on createdAt
    if (dateFrom) {
      const fromTs = new Date(dateFrom + 'T00:00:00').getTime();
      result = result.filter(l => (l.createdAt || 0) >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo + 'T23:59:59').getTime();
      result = result.filter(l => (l.createdAt || 0) <= toTs);
    }
    return result;
  };

  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = !!(search || filterUser !== 'all' || filterSource !== 'all' || dateFrom || dateTo);

  // ===== RENDER: MASTER PASSWORD =====
  if (!authChecked) {
    return null; // Avoid flicker while checking auth state
  }

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <img src="/logo.png" alt="Royal Track Building Contracting" className="login-logo" />
          </div>
          <div className="login-eyebrow">🔒 Secure Access · Authorized personnel only</div>
          <form onSubmit={handleMasterPassword} className="master-password-form">
            <div className="form-group">
              <label className="form-label">Enter access password</label>
              <input
                type="password"
                className="form-input"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                placeholder="••••••••"
                autoFocus
              />
              {passwordError && <div className="password-error">{passwordError}</div>}
            </div>
            <button type="submit" className="btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Continue →
            </button>
          </form>
          <div className="login-footer">DUBAI · UAE · ROYAL TRACK LLC</div>
        </div>
      </div>
    );
  }

  // ===== RENDER: USER SELECTION =====
  if (!currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <img src="/logo.png" alt="Royal Track Building Contracting" className="login-logo" />
          </div>
          <div className="login-eyebrow">Select your account</div>
          <div className="user-list">
            {USERS.map(u => (
              <button key={u.name} className="user-btn" onClick={() => handleLogin(u.name)}>
                <div className="user-avatar">{initials(u.name)}</div>
                <div className="user-info">
                  <div className="user-name">{u.name}</div>
                  <div className="user-role">{u.role}</div>
                </div>
                <div style={{ color: 'var(--gold)', fontSize: 18 }}>→</div>
              </button>
            ))}
          </div>
          <div className="login-footer">
            <button className="lock-link" onClick={handleFullLogout}>🔒 Lock CRM</button>
          </div>
        </div>
      </div>
    );
  }

  const filteredLeads = getFilteredLeads();
  const detailLead = detailLeadId ? leads.find(l => l.id === detailLeadId) : null;

  // ===== RENDER: APP =====
  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-logo-wrap">
            <img src="/logo.png" alt="Royal Track" className="brand-logo-img" />
          </div>
        </div>
        <div className="nav-tabs">
          <button
            className={'nav-tab' + (topView === 'pipeline' ? ' active' : '')}
            onClick={() => setTopView('pipeline')}
          >📊 <span>Pipeline</span></button>
          <button
            className={'nav-tab' + (topView === 'dashboard' ? ' active' : '')}
            onClick={() => setTopView('dashboard')}
          >📈 <span>Dashboard</span></button>
        </div>
        <div className="topbar-right">
          <div className="sync-indicator" title={
            syncStatus === 'syncing' ? 'Syncing...' :
            syncStatus === 'error' ? 'Sync error' : 'In sync'
          }>
            <div className={'sync-dot ' + syncStatus}></div>
            <span>
              {syncStatus === 'syncing' ? 'Syncing' :
               syncStatus === 'error' ? 'Offline' : 'Live'}
            </span>
          </div>
          <button className="refresh-btn" onClick={() => fetchLeads()} title="Refresh">↻</button>
          <div className="topbar-user">
            <div className="user-avatar">{initials(currentUser)}</div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{currentUser}</span>
              <span className={'topbar-user-role ' + (isAdminUser(currentUser) ? 'role-admin' : 'role-sales')}>
                {USERS.find(u => u.name === currentUser)?.role || ''}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {/* Main content */}
      <div className="main">
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search leads by name, phone, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
            <option value="all">All team members</option>
            {USERS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
          </select>
          <select className="filter-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="date-range">
            <span className="date-range-label">📅 From</span>
            <input
              type="date"
              className="date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
            />
            <span className="date-range-label">To</span>
            <input
              type="date"
              className="date-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
            />
            {(dateFrom || dateTo) && (
              <button className="date-clear" onClick={clearDateRange} title="Clear date range">×</button>
            )}
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === 'kanban' ? 'active' : ''}
              onClick={() => { setViewMode('kanban'); setTopView('pipeline'); }}
            >🗂 Kanban</button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => { setViewMode('list'); setTopView('pipeline'); }}
            >📋 List</button>
          </div>
          <button className="btn-secondary" onClick={() => setImportModalOpen(true)} title="Import from Excel/CSV">
            📥 Import
          </button>
          <button className="btn-primary" onClick={() => openLeadModal()}>+ New Lead</button>
        </div>

        {hasActiveFilters && (
          <div className="filter-summary">
            <span>Showing <strong>{getFilteredLeads().length}</strong> of <strong>{leads.length}</strong> leads</span>
            {(dateFrom || dateTo) && (
              <span className="filter-chip">
                📅 {dateFrom || '...'} → {dateTo || '...'}
              </span>
            )}
            <button className="btn-ghost" onClick={() => {
              setSearch(''); setFilterUser('all'); setFilterSource('all'); clearDateRange();
            }}>Clear all filters</button>
          </div>
        )}

        <div className="content">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <div>Loading your leads...</div>
            </div>
          ) : topView === 'dashboard' ? (
            <DashboardView leads={filteredLeads} totalLeadsCount={leads.length} currentUser={currentUser} />
          ) : viewMode === 'kanban' ? (
            <PipelineView
              leads={filteredLeads}
              allLeadsCount={leads.length}
              onSelectLead={setDetailLeadId}
              onAddFirst={() => openLeadModal()}
            />
          ) : (
            <ListView
              leads={filteredLeads}
              allLeadsCount={leads.length}
              onSelectLead={setDetailLeadId}
              onAddFirst={() => openLeadModal()}
            />
          )}
        </div>
      </div>

      {/* Add/Edit lead modal */}
      {leadModal.open && (
        <LeadFormModal
          editingId={leadModal.editingId}
          formData={formData}
          setFormData={setFormData}
          onSave={saveLead}
          onClose={() => setLeadModal({ open: false, editingId: null })}
        />
      )}

      {/* Detail modal */}
      {detailLead && (
        <DetailModal
          lead={detailLead}
          currentUser={currentUser}
          newActivityType={newActivityType}
          setNewActivityType={setNewActivityType}
          newActivityText={newActivityText}
          setNewActivityText={setNewActivityText}
          onAddActivity={() => addActivity(detailLead.id)}
          onChangeStage={(stageId) => changeStage(detailLead.id, stageId)}
          onEdit={() => {
            openLeadModal(detailLead.id);
          }}
          onDelete={() => deleteLead(detailLead.id)}
          onClose={() => setDetailLeadId(null)}
          onUploadFiles={(files) => handleFileUpload(detailLead.id, files)}
          onDeleteAttachment={(attachmentId) => deleteAttachment(detailLead.id, attachmentId)}
          onDeleteActivity={(activityId) => deleteActivity(detailLead.id, activityId)}
          uploadingFile={uploadingFile}
        />
      )}

      {/* Import modal */}
      {importModalOpen && (
        <ImportModal
          currentUser={currentUser}
          onImport={importLeads}
          onClose={() => setImportModalOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={'toast show' + (toast.isError ? ' error' : '')}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

function LeadCard({ lead, onClick }) {
  const last = lastActivityTime(lead);
  const stale = daysSince(last) >= 7;
  return (
    <div className={'lead-card' + (stale ? ' lead-card-stale' : '')} onClick={onClick}>
      <div className="lead-card-name">{lead.name}</div>
      <div className="lead-card-meta">
        {lead.location && <span>📍 {lead.location}</span>}
        {lead.source && <span className="lead-card-tag">{lead.source}</span>}
      </div>
      {lead.lookingFor && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
          {lead.lookingFor.slice(0, 80)}{lead.lookingFor.length > 80 ? '…' : ''}
        </div>
      )}
      {lead.value > 0 && <div className="lead-card-value">{formatAED(lead.value)}</div>}
      <div className="lead-card-footer">
        <div className="lead-card-owner">
          <div className="owner-dot">{initials(lead.assignedTo)}</div>
          {lead.assignedTo}
        </div>
        <div className={'lead-card-time' + (stale ? ' last-activity-line warning' : '')}>
          {stale ? '⚠ ' : ''}{last ? relativeTime(last) : 'no activity'}
        </div>
      </div>
    </div>
  );
}

function PipelineView({ leads, allLeadsCount, onSelectLead, onAddFirst }) {
  if (allLeadsCount === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏗️</div>
        <div className="empty-state-title">No leads yet</div>
        <div className="empty-state-text">Add your first lead to get started.</div>
        <button className="btn-gold" onClick={onAddFirst}>+ Add your first lead</button>
      </div>
    );
  }
  return (
    <div className="pipeline">
      {STAGES.map(stage => {
        const stageLeads = leads
          .filter(l => l.stage === stage.id)
          .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        return (
          <div className="stage-column" key={stage.id}>
            <div className="stage-header">
              <div className="stage-title">
                <div className="stage-dot" style={{ '--stage-color': stage.color }}></div>
                {stage.name}
              </div>
              <div className="stage-count">{stageLeads.length}</div>
            </div>
            <div className="stage-cards">
              {stageLeads.length === 0 ? (
                <div className="stage-empty">No leads in this stage</div>
              ) : stageLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onClick={() => onSelectLead(lead.id)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ leads, allLeadsCount, onSelectLead, onAddFirst }) {
  if (allLeadsCount === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏗️</div>
        <div className="empty-state-title">No leads yet</div>
        <div className="empty-state-text">Add your first lead to get started.</div>
        <button className="btn-gold" onClick={onAddFirst}>+ Add your first lead</button>
      </div>
    );
  }
  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">No matching leads</div>
        <div className="empty-state-text">Try adjusting your filters or search.</div>
      </div>
    );
  }
  const sorted = [...leads].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  return (
    <div className="list-view">
      <table className="list-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Phone</th>
            <th>Location</th>
            <th>Source</th>
            <th>Stage</th>
            <th>Value</th>
            <th>Owner</th>
            <th>Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(lead => {
            const stage = getStage(lead.stage);
            const last = lastActivityTime(lead);
            const stale = daysSince(last) >= 7;
            return (
              <tr key={lead.id} onClick={() => onSelectLead(lead.id)}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{lead.name}</div>
                  {lead.lookingFor && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {lead.lookingFor.slice(0, 60)}{lead.lookingFor.length > 60 ? '…' : ''}
                    </div>
                  )}
                </td>
                <td>{lead.phone || '—'}</td>
                <td>{lead.location || '—'}</td>
                <td>{lead.source ? <span className="lead-card-tag">{lead.source}</span> : '—'}</td>
                <td>
                  <span className="stage-badge" style={{ borderColor: stage.color + '40', color: stage.color }}>
                    <span className="stage-dot" style={{ '--stage-color': stage.color, width: 6, height: 6 }}></span>
                    {stage.name}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: lead.stage === 'won' ? 'var(--success)' : 'var(--text)' }}>
                  {lead.value > 0 ? formatAED(lead.value) : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="owner-dot">{initials(lead.assignedTo)}</div>
                    {lead.assignedTo}
                  </div>
                </td>
                <td className={stale ? 'last-activity-line warning' : ''} style={{ fontSize: 12 }}>
                  {stale ? '⚠ ' : ''}{last ? relativeTime(last) : 'never'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DashboardView({ leads, totalLeadsCount, currentUser }) {
  const won = leads.filter(l => l.stage === 'won');
  const active = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost');
  const pipelineValue = active.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const wonValue = won.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const conversionRate = leads.length ? Math.round((won.length / leads.length) * 100) : 0;
  const isFiltered = totalLeadsCount && totalLeadsCount !== leads.length;
  const userIsAdmin = isAdminUser(currentUser);

  // For sales users: only show themselves in team performance (they can't see others' data anyway)
  const visibleUsers = userIsAdmin ? USERS : USERS.filter(u => u.name === currentUser);

  const userStats = visibleUsers.map(u => {
    const userLeads = leads.filter(l => l.assignedTo === u.name);
    const userWon = userLeads.filter(l => l.stage === 'won');
    return {
      name: u.name,
      total: userLeads.length,
      active: userLeads.filter(l => l.stage !== 'won' && l.stage !== 'lost').length,
      won: userWon.length,
      wonValue: userWon.reduce((s, l) => s + (Number(l.value) || 0), 0),
    };
  });

  const stageStats = STAGES.map(s => ({
    ...s,
    count: leads.filter(l => l.stage === s.id).length,
  }));

  const staleLeads = active.filter(l => daysSince(lastActivityTime(l)) >= 7);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent-color': 'var(--info)' }}>
          <div className="stat-label">{isFiltered ? 'Filtered Inquiries' : 'Total Leads'}</div>
          <div className="stat-value">{leads.length}</div>
          <div className="stat-sub">
            {isFiltered ? `of ${totalLeadsCount} total` : `${active.length} active`}
          </div>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--gold)' }}>
          <div className="stat-label">Pipeline Value</div>
          <div className="stat-value">{pipelineValue > 0 ? formatAED(pipelineValue) : '—'}</div>
          <div className="stat-sub">Across {active.length} active deals</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--success)' }}>
          <div className="stat-label">Won Deals</div>
          <div className="stat-value">{won.length}</div>
          <div className="stat-sub">{wonValue > 0 ? formatAED(wonValue) : 'No value recorded'}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--purple)' }}>
          <div className="stat-label">Conversion Rate</div>
          <div className="stat-value">{conversionRate}%</div>
          <div className="stat-sub">{won.length} won of {leads.length}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--warning)' }}>
          <div className="stat-label">Need Follow-up</div>
          <div className="stat-value">{staleLeads.length}</div>
          <div className="stat-sub">No activity for 7+ days</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 8 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div className="detail-section-title" style={{ marginBottom: 14 }}>Team Performance</div>
          {userStats.map(u => (
            <div key={u.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="user-avatar" style={{ width: 34, height: 34 }}>{initials(u.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.active} active · {u.won} won</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{u.total}</div>
                <div style={{ fontSize: 11, color: 'var(--success)' }}>{u.wonValue ? formatAED(u.wonValue) : ''}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div className="detail-section-title" style={{ marginBottom: 14 }}>Pipeline Stages</div>
          {stageStats.map(s => {
            const pct = leads.length ? (s.count / leads.length) * 100 : 0;
            return (
              <div key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div className="stage-dot" style={{ '--stage-color': s.color }}></div>
                    {s.name}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.count}</div>
                </div>
                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: s.color, width: pct + '%', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function LeadFormModal({ editingId, formData, setFormData, onSave, onClose }) {
  const setField = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editingId ? 'Edit Lead' : 'New Lead'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Client name <span className="required">*</span></label>
              <input className="form-input" placeholder="e.g. Ahmed Al Mansouri"
                value={formData.name || ''} onChange={setField('name')} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="+971 50 ..."
                value={formData.phone || ''} onChange={setField('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" placeholder="name@example.com"
                value={formData.email || ''} onChange={setField('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Area</label>
              <input className="form-input" placeholder="e.g. Jumeirah, Business Bay"
                value={formData.location || ''} onChange={setField('location')} />
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={formData.source || ''} onChange={setField('source')}>
                <option value="">— Select source —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Looking for (project / requirement)</label>
              <textarea className="form-textarea"
                placeholder="e.g. Villa renovation in Al Barsha, 4-bedroom, kitchen and bathrooms..."
                value={formData.lookingFor || ''} onChange={setField('lookingFor')} />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated value (AED)</label>
              <input className="form-input" type="number" placeholder="0"
                value={formData.value || ''} onChange={setField('value')} />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned to</label>
              <select className="form-select" value={formData.assignedTo || ''} onChange={setField('assignedTo')}>
                {USERS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Stage</label>
              <select className="form-select" value={formData.stage || 'new'} onChange={setField('stage')}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={onSave}>Save Lead</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  lead, currentUser, newActivityType, setNewActivityType,
  newActivityText, setNewActivityText,
  onAddActivity, onChangeStage, onEdit, onDelete, onClose,
  onUploadFiles, onDeleteAttachment, onDeleteActivity, uploadingFile
}) {
  const stage = getStage(lead.stage);
  const stageIdx = STAGES.findIndex(s => s.id === lead.stage);
  const last = lastActivityTime(lead);
  const activities = [...(lead.activities || [])].reverse();
  const attachments = [...(lead.attachments || [])].reverse();
  const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');

  const icons = {
    call: '📞', note: '📝', meeting: '🤝', email: '✉️',
    whatsapp: '💬', stage: '🎯', file: '📎'
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal modal-large">
        <div className="modal-header">
          <div className="modal-title">Lead Details</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="detail-header">
          <div className="detail-top-row">
            <div>
              <div className="detail-name">{lead.name}</div>
              <div className="detail-subtitle">
                {lead.lookingFor ? linkify(lead.lookingFor) : 'No requirement details added yet'}
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn-secondary" onClick={onEdit}>Edit</button>
              <button className="btn-danger" onClick={onDelete}>Delete</button>
            </div>
          </div>
          <div className="detail-contact-row">
            {lead.phone && (
              <div className="detail-contact-item">
                <span className="icon">📞</span>
                <a href={`tel:${lead.phone}`}>{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="detail-contact-item">
                <span className="icon">✉️</span>
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </div>
            )}
            {lead.location && (
              <div className="detail-contact-item">
                <span className="icon">📍</span>{lead.location}
              </div>
            )}
            {cleanPhone && (
              <div className="detail-contact-item">
                <span className="icon">💬</span>
                <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              </div>
            )}
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-main">
            <div className="detail-section">
              <div className="detail-section-title">Pipeline Stage</div>
              <div className="stage-pipeline-mini">
                {STAGES.filter(s => s.id !== 'lost').map((s, i) => {
                  let cls = 'stage-step';
                  if (lead.stage !== 'lost') {
                    if (i < stageIdx) cls += ' completed';
                    else if (i === stageIdx) cls += ' current';
                  }
                  return <div key={s.id} className={cls} title={s.name}></div>;
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {STAGES.map(s => (
                  <button
                    key={s.id}
                    className={s.id === lead.stage ? 'btn-gold' : 'btn-secondary'}
                    style={{
                      padding: '5px 10px', fontSize: 11,
                      ...(s.id !== lead.stage ? { borderColor: s.color + '40', color: s.color } : {})
                    }}
                    onClick={() => onChangeStage(s.id)}
                  >{s.name}</button>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Add Activity</div>
              <div className="activity-add">
                <div className="activity-type-tabs">
                  {ACTIVITY_TYPES.map(t => (
                    <button
                      key={t.id}
                      className={'activity-type-tab' + (newActivityType === t.id ? ' active' : '')}
                      onClick={() => setNewActivityType(t.id)}
                    >{t.icon} {t.label}</button>
                  ))}
                </div>
                <div className="activity-input-row">
                  <textarea
                    placeholder={`What happened? Add details from the ${newActivityType}...`}
                    value={newActivityText}
                    onChange={(e) => setNewActivityText(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn-gold" onClick={onAddActivity}>
                    Log {newActivityType}
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Activity Timeline ({activities.length})</div>
              {activities.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>
                  No activities yet. Log your first call or note above.
                </div>
              ) : (
                <div className="timeline">
                  {activities.map(a => (
                    <div key={a.id} className="timeline-item">
                      <div className={`timeline-icon ${a.type}`}>{icons[a.type] || '•'}</div>
                      <div className="timeline-content">
                        <div className="timeline-meta">
                          <div>
                            <span className="timeline-author">{a.user || '—'}</span>
                            <span style={{ margin: '0 6px' }}>·</span>
                            <span style={{ textTransform: 'capitalize' }}>{a.type}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span title={formatDate(a.timestamp)}>{relativeTime(a.timestamp)}</span>
                            {a.type !== 'stage' && (
                              <button
                                className="timeline-delete"
                                onClick={() => onDeleteActivity(a.id)}
                                title="Delete this entry"
                              >×</button>
                            )}
                          </div>
                        </div>
                        <div className="timeline-text">{linkify(a.content)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-section">
              <div className="files-header">
                <div className="detail-section-title" style={{ margin: 0 }}>
                  Files & Documents ({attachments.length})
                </div>
                <label className="file-upload-btn">
                  📎 Upload
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                    onChange={(e) => {
                      onUploadFiles(e.target.files);
                      e.target.value = '';
                    }}
                    disabled={!!uploadingFile}
                  />
                </label>
              </div>

              {uploadingFile && (
                <div className="upload-progress">
                  <div className="spinner-small"></div>
                  Uploading {uploadingFile}...
                </div>
              )}

              {attachments.length === 0 && !uploadingFile ? (
                <div className="files-empty">
                  No files uploaded yet. Click <strong>Upload</strong> to add site visit photos, client PDFs, quotations, or any documents.
                </div>
              ) : (
                <div className="files-grid">
                  {attachments.map(f => (
                    <FileCard
                      key={f.id}
                      file={f}
                      onDelete={() => onDeleteAttachment(f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="detail-side">
            <div className="detail-section">
              <div className="detail-section-title">Details</div>
              <div className="info-row">
                <div className="info-label">Current Stage</div>
                <div className="info-value">
                  <span className="stage-badge" style={{ borderColor: stage.color + '40', color: stage.color }}>
                    <span className="stage-dot" style={{ '--stage-color': stage.color, width: 6, height: 6 }}></span>
                    {stage.name}
                  </span>
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Estimated Value</div>
                <div className="info-value">{lead.value > 0 ? formatAED(lead.value) : '—'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Source</div>
                <div className="info-value">{lead.source || '—'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Assigned To</div>
                <div className="info-value">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span className="owner-dot">{initials(lead.assignedTo)}</span>
                    {lead.assignedTo}
                  </span>
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Created By</div>
                <div className="info-value">{lead.createdBy || '—'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Created</div>
                <div className="info-value" style={{ fontSize: 11 }}>{formatDate(lead.createdAt)}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Last Activity</div>
                <div className="info-value" style={{ fontSize: 11 }}>{last ? relativeTime(last) : 'never'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileCard({ file, onDelete }) {
  const info = getFileTypeInfo(file);
  const isImage = info.kind === 'image';

  return (
    <div className="file-card">
      <button
        className="file-card-delete"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        title="Delete file"
        aria-label="Delete file"
      >×</button>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="file-card-link"
      >
        {isImage ? (
          <div
            className="file-thumb-image"
            style={{ backgroundImage: `url(${file.url})` }}
            title={file.name}
          ></div>
        ) : (
          <div className="file-thumb-icon">
            <div className={`file-icon-badge ${info.badge}`}>{info.ext}</div>
          </div>
        )}
        <div className="file-card-info">
          <div className="file-card-name" title={file.name}>{file.name}</div>
          <div className="file-card-meta">
            <span className="owner-dot">{initials(file.uploadedBy)}</span>
            <span>{file.uploadedBy}</span>
            <span>·</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <div className="file-card-meta" style={{ marginTop: 2 }}>
            {relativeTime(file.uploadedAt)}
          </div>
        </div>
      </a>
    </div>
  );
}

/* ===== EXCEL/CSV IMPORT MODAL ===== */
const FIELD_HINTS = {
  name: ['name', 'client', 'customer', 'full name', 'client name', 'customer name', 'lead name'],
  phone: ['phone', 'mobile', 'contact', 'number', 'cell', 'tel', 'whatsapp'],
  email: ['email', 'e-mail', 'mail'],
  location: ['location', 'area', 'city', 'address', 'place', 'region'],
  source: ['source', 'channel', 'platform', 'from', 'origin', 'lead source'],
  lookingFor: ['requirement', 'looking for', 'project', 'work', 'service', 'description', 'details', 'enquiry', 'inquiry', 'notes'],
  value: ['value', 'budget', 'amount', 'cost', 'price', 'aed', 'estimate', 'deal value'],
  stage: ['stage', 'status', 'state'],
  assignedTo: ['assigned', 'owner', 'sales', 'rep', 'agent', 'salesperson'],
  date: ['date', 'created', 'inquiry date', 'lead date', 'received', 'created at'],
};

function autoDetectMapping(headers) {
  const mapping = {};
  const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase().trim());

  for (const [field, hints] of Object.entries(FIELD_HINTS)) {
    for (const hint of hints) {
      const idx = lowerHeaders.findIndex(h => h === hint || h.includes(hint));
      if (idx !== -1) {
        mapping[field] = headers[idx];
        break;
      }
    }
  }
  return mapping;
}

function ImportModal({ currentUser, onImport, onClose }) {
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError('');
    setFileName(file.name);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });

      if (data.length < 2) {
        setError('File appears empty or has no data rows.');
        setParsing(false);
        return;
      }

      const fileHeaders = data[0].map(h => (h || '').toString().trim()).filter(h => h);
      const fileRows = data.slice(1).filter(row => row.some(c => c !== '' && c != null));

      setHeaders(fileHeaders);
      setRows(fileRows);
      setMapping(autoDetectMapping(fileHeaders));
    } catch (err) {
      console.error('Parse error:', err);
      setError('Could not read file. Please make sure it is a valid Excel or CSV file.');
    } finally {
      setParsing(false);
    }
  };

  const getRowValue = (row, fieldName) => {
    const col = mapping[fieldName];
    if (!col) return '';
    const idx = headers.indexOf(col);
    if (idx === -1) return '';
    return (row[idx] || '').toString().trim();
  };

  const parseDate = (v) => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.getTime();
    return null;
  };

  const handleImport = () => {
    if (!mapping.name) {
      setError('Please map the "Name" field — it is required.');
      return;
    }

    const newLeads = rows.map(row => {
      const dateValue = parseDate(getRowValue(row, 'date'));
      const stageValue = (getRowValue(row, 'stage') || '').toLowerCase();
      const matchedStage = STAGES.find(s =>
        s.id === stageValue || s.name.toLowerCase() === stageValue
      );
      const assignedRaw = getRowValue(row, 'assignedTo');
      const matchedUser = USERS.find(u =>
        u.name.toLowerCase() === assignedRaw.toLowerCase() ||
        u.name.toLowerCase().includes(assignedRaw.toLowerCase())
      );

      const lead = {
        id: 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
        name: getRowValue(row, 'name'),
        phone: getRowValue(row, 'phone'),
        email: getRowValue(row, 'email'),
        location: getRowValue(row, 'location'),
        source: getRowValue(row, 'source') || 'Imported',
        lookingFor: getRowValue(row, 'lookingFor'),
        value: parseFloat(getRowValue(row, 'value').replace(/[^0-9.]/g, '')) || 0,
        stage: matchedStage ? matchedStage.id : 'new',
        assignedTo: matchedUser ? matchedUser.name : currentUser,
        createdBy: currentUser,
        createdAt: dateValue || Date.now(),
        updatedAt: Date.now(),
        activities: [{
          id: 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
          type: 'note',
          content: `Imported from Excel by ${currentUser}`,
          user: currentUser,
          timestamp: Date.now(),
        }],
      };
      return lead;
    }).filter(l => l.name);

    if (newLeads.length === 0) {
      setError('No valid rows found. Make sure the Name column has values.');
      return;
    }

    onImport(newLeads);
  };

  const fields = [
    { id: 'name', label: 'Client Name', required: true },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'location', label: 'Location / Area' },
    { id: 'source', label: 'Source' },
    { id: 'lookingFor', label: 'Looking For / Requirement' },
    { id: 'value', label: 'Value (AED)' },
    { id: 'stage', label: 'Stage' },
    { id: 'assignedTo', label: 'Assigned To' },
    { id: 'date', label: 'Inquiry Date' },
  ];

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal modal-large">
        <div className="modal-header">
          <div className="modal-title">📥 Import Leads from Excel/CSV</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {headers.length === 0 ? (
            <div>
              <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                Apni purani Excel sheet ya CSV file upload karein. Saare leads automatically import ho jayenge,
                aur aap har column ko CRM ke fields ke saath manually map kar saktay hain.
              </p>
              <div style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: 30, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                <label className="btn-gold" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  Choose Excel / CSV File
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".xlsx,.xls,.csv,.tsv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFile}
                  />
                </label>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  Supports: .xlsx, .xls, .csv
                </div>
              </div>
              {parsing && (
                <div className="upload-progress" style={{ marginTop: 16 }}>
                  <div className="spinner-small"></div>
                  Reading file...
                </div>
              )}
              {error && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{fileName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rows.length} rows · {headers.length} columns detected</div>
                </div>
                <button className="btn-secondary" onClick={() => { setHeaders([]); setRows([]); setMapping({}); setFileName(''); }}>
                  Choose Different File
                </button>
              </div>

              <div className="detail-section-title" style={{ marginBottom: 10 }}>Map Excel columns to CRM fields</div>
              <div className="import-mapping">
                {fields.map(f => (
                  <div className="import-mapping-row" key={f.id}>
                    <label className="import-mapping-label">
                      {f.label}
                      {f.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                    </label>
                    <select
                      className="form-select"
                      value={mapping[f.id] || ''}
                      onChange={(e) => setMapping(m => ({ ...m, [f.id]: e.target.value }))}
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="detail-section-title" style={{ marginTop: 20, marginBottom: 10 }}>Preview (first 3 rows)</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table className="list-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      {fields.filter(f => mapping[f.id]).map(f => (
                        <th key={f.id}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} style={{ cursor: 'default' }}>
                        {fields.filter(f => mapping[f.id]).map(f => (
                          <td key={f.id}>{getRowValue(row, f.id) || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {headers.length > 0 && (
            <button className="btn-gold" onClick={handleImport}>
              Import {rows.length} Leads
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
