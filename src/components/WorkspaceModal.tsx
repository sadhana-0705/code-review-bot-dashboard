import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { WorkspaceMember } from '../types/index.ts';
import { X, Users, Plus, Shield, UserCheck, Code, Check } from 'lucide-react';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose }) => {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    refreshWorkspaces,
    token,
    user,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'switch' | 'create' | 'members'>('switch');
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Members state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'reviewer' | 'developer'>('developer');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (activeWorkspace && token && activeTab === 'members') {
      fetchMembers();
    }
  }, [activeWorkspace?.id, token, activeTab]);

  const fetchMembers = async () => {
    if (!activeWorkspace || !token) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim() || !token || isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newWsName.trim(),
          description: newWsDesc.trim(),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        await refreshWorkspaces();
        setActiveWorkspace(created);
        setNewWsName('');
        setNewWsDesc('');
        setActiveTab('switch');
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !activeWorkspace || !token || isAddingMember) return;
    setIsAddingMember(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      });
      if (res.ok) {
        setNewMemberEmail('');
        await fetchMembers();
      }
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setIsAddingMember(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Team Workspaces & RBAC
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('switch')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'switch'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Your Workspaces
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Manage Team & Roles
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            + Create Workspace
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {activeTab === 'switch' && (
            <div className="space-y-3">
              <p className="text-slate-500 dark:text-slate-400">
                Switch your active team workspace to share code reviews, review rules, and metrics with teammates:
              </p>

              <div className="space-y-2">
                {workspaces.map(ws => {
                  const isActive = activeWorkspace?.id === ws.id;
                  return (
                    <div
                      key={ws.id}
                      onClick={() => setActiveWorkspace(ws)}
                      className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {ws.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            role: {ws.userRole || 'admin'}
                          </span>
                        </div>
                        {ws.description && (
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                            {ws.description}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                          <Check className="w-4 h-4" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {activeWorkspace?.name || 'Workspace'} Members
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    Role-Based Access Control (RBAC): Admin, Reviewer, Developer
                  </p>
                </div>
              </div>

              {/* Add Member Form */}
              <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <select
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value as any)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="developer">Developer</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer"
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </form>

              {/* Member List */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {loadingMembers ? (
                  <div className="p-6 text-center text-slate-500">Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">No additional members added yet.</div>
                ) : (
                  members.map(m => (
                    <div key={m.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                          {m.email[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.email}</span>
                      </div>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 capitalize">
                        {m.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Core Platform Engineering"
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  value={newWsDesc}
                  onChange={e => setNewWsDesc(e.target.value)}
                  placeholder="Team mission or shared repository scope..."
                  rows={3}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating || !newWsName.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold cursor-pointer transition-colors"
              >
                {isCreating ? 'Provisioning...' : 'Create Team Workspace'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
