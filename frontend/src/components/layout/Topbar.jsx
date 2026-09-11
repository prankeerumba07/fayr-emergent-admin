import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Avatar } from "@/components/shared/UI";
import { PRESENCE_STYLE } from "@/lib/constants";
import { Search, ChevronDown, Command, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PRESENCE_OPTIONS = ["online", "away", "busy", "offline"];

export default function Topbar() {
  const { currentAgent, agents, setCurrentAgent, changePresence } = useApp();
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  if (!currentAgent) return <div className="h-[65px] border-b border-slate-200 bg-white" />;
  const p = PRESENCE_STYLE[currentAgent.presence];

  return (
    <header className="flex h-[65px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-8" data-testid="topbar">
      <div className="relative w-full max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="global-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets, chats, users…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm text-slate-700 outline-none transition-colors focus:border-slate-300 focus:bg-white"
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          <Command size={10} /> K
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* current user switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="current-agent-switcher" className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:bg-slate-50">
              <Avatar src={currentAgent.avatar} name={currentAgent.name} size={30} presence={currentAgent.presence} />
              <div className="text-left">
                <p className="text-xs font-semibold leading-none text-slate-900">{currentAgent.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{currentAgent.role}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs">Switch acting agent</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {agents.map((a) => (
              <DropdownMenuItem key={a.id} data-testid={`switch-agent-${a.id}`} onClick={() => setCurrentAgent(a)} className="gap-2">
                <Avatar src={a.avatar} name={a.name} size={24} presence={a.presence} />
                <span className="flex-1 text-xs">{a.name}</span>
                <span className="text-[10px] capitalize text-slate-400">{a.short || a.role}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* presence toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="agent-presence-status-toggle" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
              <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} data-testid="agent-presence-indicator" />
              {p.label}
              <ChevronDown size={13} className="text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Set your status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRESENCE_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt} data-testid={`presence-option-${opt}`} onClick={() => changePresence(opt)} className="gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${PRESENCE_STYLE[opt].dot}`} />
                {PRESENCE_STYLE[opt].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button data-testid="logout-btn" onClick={logout} title="Log out" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600">
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
}
