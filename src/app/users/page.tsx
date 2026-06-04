"use client";

import { useState } from "react";
import {
  Users, Crown, Eye, Edit3, Trash2, ChevronDown,
  Shield, UserPlus, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────── */

type Role = "Admin" | "Editor" | "Viewer";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  lastActive: string;
  isCurrentUser?: boolean;
}

const ROLE_CONFIG: Record<Role, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}> = {
  Admin:  { label: "Admin",  icon: Crown,  color: "text-[#3c67ea]",         bg: "bg-[#f0f1f7]",   border: "border-[#e6ebf8]"  },
  Editor: { label: "Editor", icon: Edit3,  color: "text-[#3c67ea]",        bg: "bg-[#f0f1f7]",  border: "border-[#e6ebf8]" },
  Viewer: { label: "Viewer", icon: Eye,    color: "text-[#485478]", bg: "bg-[#f0f1f7]", border: "border-[#e6ebf8]" },
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Admin:  ["View all pages", "Edit all content", "Manage users", "Access settings", "Delete data"],
  Editor: ["View all pages", "Edit all content", "Run agent journeys"],
  Viewer: ["View all pages", "View-only agent output"],
};

const INITIAL_USERS: User[] = [
  { id: "u1", name: "Sarah Chen",     email: "sarah.chen@lyzr.ai",     role: "Admin",  avatar: "SC", lastActive: "Now",        isCurrentUser: true },
  { id: "u2", name: "Michael Torres", email: "michael.torres@lyzr.ai", role: "Editor", avatar: "MT", lastActive: "2 hours ago"                     },
  { id: "u3", name: "Priya Patel",    email: "priya.patel@lyzr.ai",    role: "Viewer", avatar: "PP", lastActive: "Yesterday"                       },
  { id: "u4", name: "James Wilson",   email: "james.wilson@lyzr.ai",   role: "Editor", avatar: "JW", lastActive: "3 days ago"                      },
  { id: "u5", name: "Emma Rodriguez", email: "emma.rodriguez@lyzr.ai", role: "Viewer", avatar: "ER", lastActive: "1 week ago"                      },
];

/* ─── Sub-components ─────────────────────────────────────── */

function RoleDropdown({
  userId, currentRole, onChange,
}: {
  userId: string;
  currentRole: Role;
  onChange: (id: string, role: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg  = ROLE_CONFIG[currentRole];
  const Icon = cfg.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[0.75rem] font-semibold border transition-all",
          cfg.color, cfg.bg, cfg.border
        )}
      >
        <Icon className="w-3 h-3" />
        {currentRole}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-20 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden shadow-[0_2px_4px_rgba(36,45,72,0.15)] min-w-[130px]"
            >
              {(["Admin", "Editor", "Viewer"] as Role[]).map(role => {
                const c  = ROLE_CONFIG[role];
                const RI = c.icon;
                return (
                  <button
                    key={role}
                    onClick={() => { onChange(userId, role); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-[0.75rem] uppercase tracking-[0.08em] hover:bg-[#f0f1f7] transition-colors",
                      role === currentRole ? "font-semibold" : "font-normal text-[#485478]"
                    )}
                  >
                    <RI className={cn("w-3 h-3", c.color)} />
                    {role}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserAvatar({ initials, isCurrentUser }: { initials: string; isCurrentUser?: boolean }) {
  return (
    <div className={cn(
      "w-9 h-9 rounded-[4px] flex items-center justify-center text-[0.75rem] uppercase tracking-[0.08em] font-semibold flex-shrink-0",
      isCurrentUser ? "bg-[#3c67ea] text-white" : "bg-[#f0f1f7] text-[#3c67ea]"
    )}>
      {initials}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function UsersPage() {
  const [users,     setUsers]     = useState<User[]>(INITIAL_USERS);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const [search,    setSearch]    = useState("");

  const handleRoleChange = (id: string, role: Role) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));

  const handleRemove = (id: string) => {
    setRemovedId(id);
    setTimeout(() => {
      setUsers(prev => prev.filter(u => u.id !== id));
      setRemovedId(null);
    }, 350);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount  = users.filter(u => u.role === "Admin").length;
  const editorCount = users.filter(u => u.role === "Editor").length;
  const viewerCount = users.filter(u => u.role === "Viewer").length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-6 h-6 text-[#3c67ea]" />
            <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">User Management</h1>
          </div>
          <p className="text-[0.875rem] leading-[1.2] text-[#485478]">
            Manage workspace members and their access levels
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#3c67ea] text-white text-[0.75rem] uppercase tracking-[0.08em] font-semibold rounded-[4px] hover:opacity-90 transition-opacity flex-shrink-0">
          <UserPlus className="w-3.5 h-3.5" />
          Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Members", value: users.length, icon: Users, color: "text-[#3c67ea]",         bg: "bg-[#f0f1f7]"   },
          { label: "Admins",        value: adminCount,   icon: Crown, color: "text-[#3c67ea]",         bg: "bg-[#f0f1f7]"   },
          { label: "Editors",       value: editorCount,  icon: Edit3, color: "text-[#3c67ea]",        bg: "bg-[#f0f1f7]"  },
          { label: "Viewers",       value: viewerCount,  icon: Eye,   color: "text-[#485478]", bg: "bg-[#f0f1f7]" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1.5 rounded-[4px]", stat.bg)}>
                  <Icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <span className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#485478]">{stat.label}</span>
              </div>
              <p className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Members table */}
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden mb-6">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e6ebf8] gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Users className="w-4 h-4 text-[#3c67ea]" />
            <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Workspace Members</h2>
            <span className="text-[0.75rem] font-medium text-[#485478] bg-[#f0f1f7] px-1.5 py-0.5 rounded-[2px]">
              {users.length}
            </span>
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#485478] pointer-events-none" />
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#f8f8fa] border-2 border-dotted border-transparent shadow-[0_0_0_1px_#7885ab] focus:border-[#485478] focus:shadow-none rounded-[4px] pl-8 pr-3 py-1.5 text-[0.75rem] uppercase tracking-[0.08em] text-[#242d48] placeholder:text-[#485478] outline-none"
            />
          </div>
        </div>

        {/* Column labels */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 border-b border-[#e6ebf8] bg-[#f0f1f7]">
          <span className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em]">Member</span>
          <span className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] hidden sm:block w-24 text-right">Last Active</span>
          <span className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em]">Role</span>
          <span className="w-7" />
        </div>

        <div className="divide-y divide-black/[0.04]">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-[0.875rem] leading-[1.2] text-[#485478]">
                No members match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map(user => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 1 }}
                  animate={{
                    opacity: removedId === user.id ? 0 : 1,
                    x:       removedId === user.id ? 20 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                >
                  {/* Member info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar initials={user.avatar} isCurrentUser={user.isCurrentUser} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] truncate">{user.name}</p>
                        {user.isCurrentUser && (
                          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#3c67ea] bg-[#f0f1f7] px-1.5 py-0.5 rounded-[2px] border border-[#e6ebf8] flex-shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Last active */}
                  <span className="text-[0.75rem] text-[#485478] hidden sm:block w-24 text-right flex-shrink-0">
                    {user.lastActive}
                  </span>

                  {/* Role */}
                  <div className="flex-shrink-0">
                    {user.isCurrentUser ? (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[0.75rem] font-semibold border",
                        ROLE_CONFIG[user.role].color,
                        ROLE_CONFIG[user.role].bg,
                        ROLE_CONFIG[user.role].border
                      )}>
                        {(() => { const I = ROLE_CONFIG[user.role].icon; return <I className="w-3 h-3" />; })()}
                        {user.role}
                      </div>
                    ) : (
                      <RoleDropdown userId={user.id} currentRole={user.role} onChange={handleRoleChange} />
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => !user.isCurrentUser && handleRemove(user.id)}
                    disabled={user.isCurrentUser}
                    title={user.isCurrentUser ? "Cannot remove yourself" : `Remove ${user.name}`}
                    className={cn(
                      "p-1.5 rounded-[4px] transition-colors w-7 flex items-center justify-center",
                      user.isCurrentUser
                        ? "text-[#485478] cursor-not-allowed"
                        : "text-[#485478] hover:text-[#db3743] hover:bg-white"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#e6ebf8]">
          <Shield className="w-4 h-4 text-[#3c67ea]" />
          <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Role Permissions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.05]">
          {(["Admin", "Editor", "Viewer"] as Role[]).map(role => {
            const cfg  = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            return (
              <div key={role} className="p-5">
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[0.75rem] font-semibold border mb-3",
                  cfg.color, cfg.bg, cfg.border
                )}>
                  <Icon className="w-3 h-3" />
                  {role}
                </div>
                <ul className="space-y-1.5">
                  {ROLE_PERMISSIONS[role].map(perm => (
                    <li key={perm} className="flex items-start gap-2 text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">
                      <span className="text-[#3c67ea] mt-0.5">✓</span>
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
