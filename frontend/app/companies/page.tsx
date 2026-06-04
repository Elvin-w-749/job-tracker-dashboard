"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { getUserHeaders } from "@/lib/user-context";
import {
  Briefcase,
  Building,
  LayoutDashboard,
  Settings,
  Key,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Filter,
  Calendar,
  RotateCcw,
  MapPin,
} from "lucide-react";

interface ApplicationItem {
  id: number;
  company_name: string;
  position: string;
  city: string;
  company_size: string;
  company_tier: string;
  status: string;
  match_score: number;
  apply_date: string;
  salary_range: string;
  channel: string;
  jd_text?: string;
}

interface CompanyGroup {
  company_name: string;
  company_tier: string;
  company_size: string;
  count: number;
  positions: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const TIER_COLORS: Record<string, string> = {
  "大厂": "#dc2626",
  "中大厂": "#ef4444",
  "中厂": "#f59e0b",
  "中小厂": "#fbbf24",
  "小厂": "#9ca3af",
};

const TIER_ORDER = ["大厂", "中大厂", "中厂", "中小厂", "小厂"];

export default function CompaniesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    company_name: "", position: "", city: "", status: "", channel: "",
    match_score_min: "", match_score_max: "", company_size: "", company_tier: "",
    date_from: "", date_to: "", keyword: ""
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCompanyApps, setSelectedCompanyApps] = useState<ApplicationItem[]>([]);
  const [isCompanyDetailOpen, setIsCompanyDetailOpen] = useState(false);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append("page_size", "1000");
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      company_name: "", position: "", city: "", status: "", channel: "",
      match_score_min: "", match_score_max: "", company_size: "", company_tier: "",
      date_from: "", date_to: "", keyword: ""
    });
  };

  const { data: apiKeyStatus } = useQuery({
    queryKey: ["api-key-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings/api-key`, {
        headers: getUserHeaders(),
      });
      const json = await res.json();
      return json.data;
    },
  });

  const { data: appsData, isLoading, error, refetch } = useQuery({
    queryKey: ["all-apps-companies", filters],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/applications?${buildQueryString()}`, {
        headers: getUserHeaders(),
      });
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "获取数据失败");
      return json.data;
    },
    retry: 2,
    retryDelay: 1000,
  });

  const { data: filterOptionsRaw } = useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/stats/overview`, { headers: getUserHeaders() });
      if (!res.ok) throw new Error("获取筛选选项失败");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60000,
  });

  const filterOptions = useMemo(() => {
    const companiesByCity: Record<string, Set<string>> = {};
    if (appsData?.items) {
      appsData.items.forEach((item: ApplicationItem) => {
        const city = item.city || "未知城市";
        if (!companiesByCity[city]) companiesByCity[city] = new Set();
        companiesByCity[city].add(item.company_name);
      });
    }
    const groupedCompanies: Record<string, string[]> = {};
    Object.keys(companiesByCity).sort().forEach(city => {
      groupedCompanies[city] = Array.from(companiesByCity[city]).sort();
    });

    return {
      cities: filterOptionsRaw ? Object.entries(filterOptionsRaw.city_distribution).sort(([, a], [, b]) => (b as number) - (a as number)).map(([name]) => name) : [],
      statuses: filterOptionsRaw ? Object.keys(filterOptionsRaw.status_distribution) : [],
      channels: filterOptionsRaw ? Object.keys(filterOptionsRaw.channel_distribution || {}) : [],
      companyByCity: groupedCompanies,
    };
  }, [filterOptionsRaw, appsData]);

  const companies = useMemo<CompanyGroup[]>(() => {
    if (!appsData?.items || !Array.isArray(appsData.items)) return [];

    const map = new Map<string, CompanyGroup>();

    appsData.items.forEach((app: ApplicationItem) => {
      if (!app?.company_name) return;
      const key = app.company_name;
      if (!map.has(key)) {
        map.set(key, {
          company_name: app.company_name,
          company_tier: app.company_tier || "",
          company_size: app.company_size || "",
          count: 0,
          positions: [],
        });
      }
      const group = map.get(key)!;
      group.count += 1;
      if (app.position && !group.positions.includes(app.position)) {
        group.positions.push(app.position);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const tierA = TIER_ORDER.indexOf(a.company_tier);
      const tierB = TIER_ORDER.indexOf(b.company_tier);
      if (tierA !== tierB) return tierA === -1 ? 1 : tierB === -1 ? -1 : tierA - tierB;
      return b.count - a.count;
    });
  }, [appsData]);

  const handleCompanyClick = (companyName: string) => {
    const apps = appsData?.items?.filter((app: ApplicationItem) => app.company_name === companyName) || [];
    setSelectedCompanyApps(apps);
    setIsCompanyDetailOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-blue-600">
            <Briefcase className="w-6 h-6" />
            <span className="font-bold text-lg">求职看板</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <LayoutDashboard className="w-5 h-5" />
            数据看板
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium">
            <Building className="w-5 h-5" />
            公司列表
          </button>

        </nav>

        <div className="p-3 border-t border-gray-200 space-y-1">
          <div className="px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1.5">
            <Key className="w-3 h-3" />
            {apiKeyStatus?.configured ? (
              <span className="text-emerald-600">API Key 已配置 ({apiKeyStatus.key_preview})</span>
            ) : (
              <span className="text-amber-600">API Key 未配置</span>
            )}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <Settings className="w-5 h-5" />
            设置
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <h1 className="text-xl font-semibold text-gray-800">公司列表</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setFilterOpen(true)} className="gap-2">
              <Filter className="w-4 h-4" />
              筛选
              {Object.values(filters).some(v => v !== "") && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </Button>
            <span className="text-sm text-gray-500">共 {companies.length} 家公司</span>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 text-sm mb-2">加载公司列表失败</p>
              {getErrorMessage(error) && (
                <p className="text-xs text-gray-400 mb-3">{(getErrorMessage(error)).slice(0, 100)}</p>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  重试
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                  返回看板
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <div
                  key={company.company_name}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow hover:border-blue-200 transition-all cursor-pointer"
                  onClick={() => handleCompanyClick(company.company_name)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {company.company_tier && (
                        <span
                          className="inline-flex px-2 py-0.5 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: TIER_COLORS[company.company_tier] || "#9ca3af" }}
                        >
                          {company.company_tier}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-800">{company.company_name}</h3>
                    </div>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      {company.count}
                    </span>
                  </div>

                  {company.company_size && (
                    <p className="text-xs text-gray-400 mb-2">{company.company_size}</p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {company.positions.slice(0, 3).map((pos) => (
                      <span
                        key={pos}
                        className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs"
                      >
                        {pos}
                      </span>
                    ))}
                    {company.positions.length > 3 && (
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 text-xs">
                        +{company.positions.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>筛选条件</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2">
              <Label>企业名称</Label>
              <Select value={filters.company_name} onValueChange={(v) => handleFilterChange("company_name", v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">全部</SelectItem>
                  {Object.entries(filterOptions.companyByCity).map(([city, comps]) => (
                    <SelectGroup key={city}>
                      <SelectLabel className="bg-gray-50/80 sticky top-0 font-semibold">{city}</SelectLabel>
                      {comps.map(name => <SelectItem key={name} value={name} className="pl-6">{name}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>岗位</Label>
              <Input placeholder="模糊搜索" value={filters.position} onChange={(e) => handleFilterChange("position", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>城市</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.city} onChange={(e) => handleFilterChange("city", e.target.value)}>
                <option value="">全部</option>
                {filterOptions.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>投递进度</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
                <option value="">全部</option>
                {filterOptions.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>投递渠道</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.channel} onChange={(e) => handleFilterChange("channel", e.target.value)}>
                <option value="">全部</option>
                {filterOptions.channels.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>公司档次</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.company_tier} onChange={(e) => handleFilterChange("company_tier", e.target.value)}>
                <option value="">全部</option>
                {TIER_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setFilterOpen(false)} className="flex-1">应用筛选</Button>
            <Button variant="outline" onClick={resetFilters} className="gap-1"><RotateCcw className="w-4 h-4" />重置</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCompanyDetailOpen} onOpenChange={setIsCompanyDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedCompanyApps[0]?.company_name} - 投递记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCompanyApps.map(app => (
              <div key={app.id} className="border border-gray-100 shadow-sm rounded-xl p-5 bg-white flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-lg text-gray-800">{app.position}</h4>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 font-medium">{app.status}</span>
                </div>
                <div className="text-sm text-gray-500 flex flex-wrap gap-x-5 gap-y-2">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-gray-400"/> {app.city || "-"}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-4 h-4 text-gray-400"/> {app.salary_range || "薪资面议"}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400"/> {app.apply_date}</span>
                </div>
                {app.jd_text && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50/80 p-3 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {app.jd_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
