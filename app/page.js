'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ===== CONSTANTS ===== */
const USERS = [
  { name: 'Nouman', role: 'Sales Executive' },
  { name: 'Bilal', role: 'Sales Executive' },
  { name: 'Zafar', role: 'Sales Executive' },
];

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
  return name.trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
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

/* ===== MAIN COMPONENT ===== */
export default function Page() {
  const [currentUser, setCurrentUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'error'
  const [topView, setTopView] = useState('pipeline'); // 'pipeline' | 'dashboard'
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [leadModal, setLeadModal] = useState({ open: false, editingId: null });
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [newActivityType, setNewActivityType] = useState('call');
  const [newActivityText, setNewActivityText] = useState('');
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadingFile, setUploadingFile] = useState(null);

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

  // Initial load + restore user session
  useEffect(() => {
    const savedUser = typeof window !== 'undefined' && sessionStorage.getItem('rt_current_user');
    if (savedUser && USERS.find(u => u.name === savedUser)) {
      setCurrentUser(savedUser);
    }
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

  const handleLogin = (userName) => {
    sessionStorage.setItem('rt_current_user', userName);
    setCurrentUser(userName);
    fetchLeads();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rt_current_user');
    setCurrentUser(null);
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
        activities: [{
          id: actId(),
          type: 'stage',
          content: `Lead created by ${currentUser}`,
          user: currentUser,
          timestamp: Date.now(),
        }],
      };
      setLeads(prev => [...prev, newLead]);
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

  // ===== FILTERING =====
  const getFilteredLeads = () => {
    let result = [...leads];
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
    return result;
  };

  // ===== RENDER: LOGIN =====
  if (!currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-crest">RT</div>
            <div className="login-title">Royal Track</div>
            <div className="login-subtitle">Building Contracting · CRM</div>
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
          <div className="login-footer">DUBAI · UAE · ROYAL TRACK LLC</div>
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
          <div className="brand-crest">RT</div>
          <div className="brand-text">
            <div className="brand-name">Royal Track</div>
            <div className="brand-tag">CRM</div>
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
            <span>{currentUser}</span>
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
          <button className="btn-primary" onClick={() => openLeadModal()}>+ New Lead</button>
        </div>

        <div className="content">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <div>Loading your leads...</div>
            </div>
          ) : topView === 'dashboard' ? (
            <DashboardView leads={leads} />
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
          uploadingFile={uploadingFile}
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
        const stageLeads = leads.filter(l => l.stage === stage.id);
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
  const sorted = [...leads].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
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

function DashboardView({ leads }) {
  const won = leads.filter(l => l.stage === 'won');
  const active = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost');
  const pipelineValue = active.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const wonValue = won.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const conversionRate = leads.length ? Math.round((won.length / leads.length) * 100) : 0;

  const userStats = USERS.map(u => {
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
          <div className="stat-label">Total Leads</div>
          <div className="stat-value">{leads.length}</div>
          <div className="stat-sub">{active.length} active</div>
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
  onUploadFiles, onDeleteAttachment, uploadingFile
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
                {lead.lookingFor || 'No requirement details added yet'}
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
                          <div title={formatDate(a.timestamp)}>{relativeTime(a.timestamp)}</div>
                        </div>
                        <div className="timeline-text">{a.content}</div>
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
