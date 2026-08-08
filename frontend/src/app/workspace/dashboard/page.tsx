"use client";

import * as React from "react";
import { Stats } from "@/components/dashboard/stats";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default function WorkspaceDashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Stats overview banner */}
      <Stats />

      {/* Quick Actions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
