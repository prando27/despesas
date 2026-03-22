"use client";

import { useState, useEffect, useCallback } from "react";

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

export function useGroup() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups/current");
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
      setCurrentGroup(data.currentGroup || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, currentGroup, setCurrentGroup, loading, refetch: fetchGroups };
}
