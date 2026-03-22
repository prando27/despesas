"use client";

import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from "react";

interface GroupMember {
  memberId: string;
  id: string;
  name: string;
  image: string | null;
  role: string;
  countAsId: string | null;
  weight: number;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  splitType: string;
  groupType: string;
  role: string;
  members: GroupMember[];
}

interface GroupContextValue {
  groups: Group[];
  currentGroup: Group | null;
  setCurrentGroup: (group: Group | null) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | null>(null);

const STORAGE_KEY = "currentGroupId";

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroupState] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentGroup = useCallback((group: Group | null) => {
    setCurrentGroupState(group);
    if (group) {
      localStorage.setItem(STORAGE_KEY, group.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups/current");
      if (!res.ok) return;
      const data = await res.json();
      const fetchedGroups: Group[] = data.groups || [];
      setGroups(fetchedGroups);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = savedId ? fetchedGroups.find((g) => g.id === savedId) : null;
      setCurrentGroupState(saved || fetchedGroups[0] || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <GroupContext.Provider value={{ groups, currentGroup, setCurrentGroup, loading, refetch: fetchGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
}
