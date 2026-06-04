"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUserId, getCurrentUserName, getAllUsers, addUser, switchUser, deleteUser, getUserHeaders } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartCard, AccordionCompanySelect } from "@/components/dashboard/ChartCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import {
  Briefcase,
  Building2,
  MapPin,
  TrendingUp,
  Settings,
  Upload,
  LayoutDashboard,
  Building,
  Filter,
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Key,
  Calendar,
  FileUp,
  ImagePlus,
  Zap,
  Download,
  PlusCircle,
  Trash2,
  Bot,
  MessageCircleReply,
  Layers,
} from "lucide-react";

interface StatsData {
  total: number;
  city_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  company_size_distribution: Record<string, number>;
  company_tier_distribution: Record<string, number>;
  channel_distribution: Record<string, number>;
  match_score_avg: number;
  match_score_distribution: Record<string, number>;
  timeline: { date: string; count: number }[];
  companies_covered?: number;
  response_rate?: number;
  funnel_data?: {
    applications: number;
    views: number;
    interviews: number;
    offers: number;
    accepts: number;
  };
  monthly_trend?: { month: string; count: number }[];
  top_matches?: {
    id: number;
    company_name: string;
    position: string;
    city: string;
    match_score: number;
    status: string;
    channel: string;
    apply_date: string;
    company_tier: string;
  }[];
}

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
  education: string;
  experience: string;
  skills: string[];
  jd_text: string;
}

interface ConfirmData {
  company_name?: string;
  position?: string;
  city?: string;
  company_size?: string;
  company_tier?: string;
  salary_range?: string;
  education?: string;
  experience?: string;
  match_score?: number;
  skills?: string[];
  jd_text?: string;
  channel?: string;
  status?: string;
  [key: string]: unknown;
}

interface BatchResultItem {
  index: number;
  status: string;
  data: ConfirmData | null;
  error_message?: string;
}

interface FilterState {
  company_name: string;
  position: string;
  city: string;
  status: string;
  channel: string;
  match_score_min: string;
  match_score_max: string;
  company_size: string;
  company_tier: string;
  date_from: string;
  date_to: string;
  keyword: string;
}

interface SortState {
  sort_by: string;
  sort_order: "asc" | "desc";
}

interface FilterOptions {
  cities: string[];
  statuses: string[];
  channels: string[];
  companyByCity: Record<string, string[]>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const MATCH_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#3b82f6", "#10b981"];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TIER_COLORS: Record<string, string> = {
  "大厂": "#dc2626",
  "中大厂": "#ef4444",
  "中厂": "#f59e0b",
  "中小厂": "#fbbf24",
  "小厂": "#9ca3af",
  "未知": "#d1d5db",
};

const TIER_ORDER = ["大厂", "中大厂", "中厂", "中小厂", "小厂"];

const SORTABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "company_name", label: "企业名称" },
  { key: "position", label: "岗位" },
  { key: "city", label: "城市" },
  { key: "match_score", label: "匹配度" },
  { key: "apply_date", label: "投递日期" },
];

const ALL_STATUSES = [
  "已投递", "简历被查看", "已读不回", "7天未回复",
  "一面", "二面", "三面", "HR面",
  "已offer", "offer谈判中", "已接受offer", "已拒绝offer",
  "流程结束", "已拒绝", "面试中"
];

const TIER_DESCRIPTIONS: Record<string, string> = {
  "大厂": "(10000人以上)",
  "中大厂": "(2000-9999人)",
  "中厂": "(500-1999人)",
  "中小厂": "(100-499人)",
  "小厂": "(100人以下)"
};

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("MiniMax-Text-01");
  const [resumeProfile, setResumeProfile] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [batchPanelOpen, setBatchPanelOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [csvImporting, setCsvImporting] = useState(false);
  const [cityChartMax, setCityChartMax] = useState<number | "auto">("auto");
  const [timelineMax, setTimelineMax] = useState<number | "auto">("auto");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const pageSize = 10;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [newUserName, setNewUserName] = useState("");
  const [currentUser, setCurrentUser] = useState(getCurrentUserName());

  // 批量评分状态
  const [scoreTaskId, setScoreTaskId] = useState<string | null>(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoringStarted, setScoringStarted] = useState(false);

  // 自定义 Prompt
  const [customPrompt, setCustomPrompt] = useState("");

  // Excel 导出
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSheets, setExportSheets] = useState({
    records: true, city: true, status: true, tier: true, score: false,
  });

  // 新建/编辑记录
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApplicationItem | null>(null);
  const [recordForm, setRecordForm] = useState({
    company_name: "", position: "", city: "", status: "已投递",
    channel: "", apply_date: "", salary_range: "",
    company_size: "", company_tier: "", jd_text: "",
  });

  const [filters, setFilters] = useState<FilterState>({
    company_name: "",
    position: "",
    city: "",
    status: "",
    channel: "",
    match_score_min: "",
    match_score_max: "",
    company_size: "",
    company_tier: "",
    date_from: "",
    date_to: "",
    keyword: "",
  });

  const [sort, setSort] = useState<SortState>({
    sort_by: "apply_date",
    sort_order: "desc",
  });

  const activeFilterParams = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append("page", String(currentPage));
    params.append("page_size", String(pageSize));
    params.append("sort_by", sort.sort_by);
    params.append("sort_order", sort.sort_order);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<StatsData>({
    queryKey: ["stats", filterKey],
    queryFn: async () => {
      const filterStr = activeFilterParams();
      const url = filterStr
        ? `${API_BASE}/api/stats/overview?${filterStr}`
        : `${API_BASE}/api/stats/overview`;
      const res = await fetch(url, { headers: getUserHeaders() });
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "获取统计数据失败");
      return json.data;
    },
    retry: 1,
  });

  const {
    data: applicationsData,
    isLoading: appsLoading,
    error: appsError,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["applications", filters, sort, currentPage],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/applications?${buildQueryString()}`, { headers: getUserHeaders() });
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "获取投递记录失败");
      return json.data;
    },
    retry: 1,
  });

  const applications: ApplicationItem[] = applicationsData?.items || [];
  const totalCount: number = applicationsData?.total || 0;
  const totalPages: number = Math.ceil(totalCount / pageSize);

  const { data: apiKeyStatus } = useQuery({
    queryKey: ["api-key-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings/api-key`, { headers: getUserHeaders() });
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (apiKeyStatus?.model_name) {
      setModelName(apiKeyStatus.model_name);
    }
  }, [apiKeyStatus?.model_name]);

  const { data: resumeProfileStatus } = useQuery({
    queryKey: ["resume-profile-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings/resume-profile`, { headers: getUserHeaders() });
      const json = await res.json();
      return json.data;
    },
  });

  const { data: filterOptionsRaw } = useQuery<StatsData>({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/stats/overview`, { headers: getUserHeaders() });
      if (!res.ok) throw new Error("获取筛选选项失败");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60000,
  });

  const { data: allAppsForNames } = useQuery({
    queryKey: ["all-apps-names"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/applications?page_size=1000`, { headers: getUserHeaders() });
      if (!res.ok) throw new Error("获取公司名称失败");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60000,
  });

  // 未评分数量查询
  const { data: unscoredData, refetch: refetchUnscored } = useQuery({
    queryKey: ["unscored-count"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/applications/unscored-count`, { headers: getUserHeaders() });
      const json = await res.json();
      return json.data;
    },
    staleTime: 30000,
  });
  const unscoredCount: number = unscoredData?.unscored ?? 0;

  // 批量评分任务进度轮询
  const { data: scoreTaskStatus } = useQuery({
    queryKey: ["score-task", scoreTaskId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/applications/batch-score/status/${scoreTaskId}`, { headers: getUserHeaders() });
      const json = await res.json();
      return json.data;
    },
    enabled: !!scoreTaskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status === "completed") return false;
      return 1500;
    },
    refetchIntervalInBackground: true,
  });

  // 评分完成后刷新数据
  const scoreTaskStatusStr = useMemo(() => JSON.stringify(scoreTaskStatus), [scoreTaskStatus]);
  useEffect(() => {
    if (scoreTaskStatus?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["filter-options"] });
      refetchUnscored();
    }
  }, [scoreTaskStatusStr, queryClient, refetchUnscored]);

  const handleStartBatchScore = async () => {
    setScoringStarted(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/batch-score`, {
        method: "POST",
        headers: getUserHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data.task_id) {
          setScoreTaskId(json.data.task_id);
        } else {
          alert(json.data.message || "所有记录已有评分");
          setScoreModalOpen(false);
        }
      } else {
        alert(json.error || "启动评分失败");
      }
    } catch (err) {
      alert("请求失败: " + (err as Error).message);
    } finally {
      setScoringStarted(false);
    }
  };

  const filterOptions: FilterOptions = useMemo(() => {
    const companiesByCity: Record<string, Set<string>> = {};
    if (allAppsForNames?.items) {
      allAppsForNames.items.forEach((item: ApplicationItem) => {
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
      cities: filterOptionsRaw
        ? Object.entries(filterOptionsRaw.city_distribution)
            .sort(([, a], [, b]) => b - a)
            .map(([name]) => name)
        : [],
      statuses: filterOptionsRaw
        ? Object.keys(filterOptionsRaw.status_distribution)
        : [],
      channels: filterOptionsRaw
        ? Object.keys(filterOptionsRaw.channel_distribution || {})
        : [],
      companyByCity: groupedCompanies,
    };
  }, [filterOptionsRaw, allAppsForNames]);

  const saveApiKeyMutation = useMutation({
    mutationFn: async (payload: { key: string; model: string }) => {
      const res = await fetch(`${API_BASE}/api/settings/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserHeaders() },
        body: JSON.stringify({ api_key: payload.key, model_name: payload.model }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      alert(data.message || "保存成功");
      if (data.success) {
        setSettingsOpen(false);
        queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
      }
    },
  });

  const testApiKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings/api-key/test`, {
        method: "POST",
        headers: getUserHeaders(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      alert(data.message || "测试完成");
    },
  });

  const clearApiKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings/api-key/clear`, {
        method: "POST",
        headers: getUserHeaders(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      alert(data.message || "已重置");
      if (data.success) {
        setApiKey("");
        queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
      }
    },
  });

  const saveResumeProfileMutation = useMutation({
    mutationFn: async (profile: string) => {
      const res = await fetch(`${API_BASE}/api/settings/resume-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserHeaders() },
        body: JSON.stringify({ resume_profile: profile }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      alert(data.message || "保存成功");
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["resume-profile-status"] });
      }
    },
  });

  const [resumeUploading, setResumeUploading] = useState(false);
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/resume/analyze`, {
        method: "POST",
        headers: getUserHeaders(),
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.profile) {
        setResumeProfile(json.data.profile);
        alert("简历解析成功！请确认背景描述后点击「保存简历背景」");
      } else {
        alert(json.error || "简历解析失败");
      }
    } catch (err) {
      alert("简历上传失败: " + (err as Error).message);
    } finally {
      setResumeUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings/clear-data`, { method: "POST", headers: getUserHeaders() });
      return res.json();
    },
    onSuccess: (data) => {
      alert(data.message || "数据清除完成");
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["filter-options"] });
        queryClient.invalidateQueries({ queryKey: ["all-apps-names"] });
        setCurrentPage(1);
        window.location.reload();
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (data: ConfirmData) => {
      const res = await fetch(`${API_BASE}/api/applications/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserHeaders() },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setConfirmModalOpen(false);
      setConfirmData(null);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const { data: batchStatus } = useQuery({
    queryKey: ["batch-status", taskId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/jd/batch-status/${taskId}`, { headers: getUserHeaders() });
      const json = await res.json();
      return json.data;
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed") return false;
      return 2000;
    },
    refetchIntervalInBackground: true,
  });

  const batchStatusStr = useMemo(() => JSON.stringify(batchStatus), [batchStatus]);

  useEffect(() => {
    if (!batchStatus) return;
    if (batchStatus.results) {
      setBatchResults(batchStatus.results);
    }
    if (batchStatus.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
  }, [batchStatusStr, queryClient]);

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("images", file));

    try {
      const res = await fetch(`${API_BASE}/api/jd/batch-upload`, {
        method: "POST",
        headers: getUserHeaders(),
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setTaskId(json.data.task_id);
        setBatchPanelOpen(true);
        setBatchResults(
          Array.from({ length: json.data.total }, (_, i) => ({
            index: i,
            status: "pending",
            data: null,
          }))
        );
      } else {
        alert(json.error || json.detail || "批量上传失败");
      }
    } catch (err) {
      alert("请求失败: " + (err as Error).message);
    }
  };

  const handleSingleScore = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/applications/${id}/score`, {
        method: "POST",
        headers: getUserHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data.task_id) {
          setScoreTaskId(json.data.task_id);
          setScoringStarted(true);
        }
      } else {
        alert(json.error || "启动检测失败");
      }
    } catch (err) {
      alert("请求失败: " + (err as Error).message);
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;

        const formData = new FormData();
        formData.append("image", file);

        try {
          const res = await fetch(`${API_BASE}/api/jd/analyze`, {
            method: "POST",
            headers: getUserHeaders(),
            body: formData,
          });
          const result = await res.json();
          if (result.success) {
            setConfirmData(result.data);
            setConfirmModalOpen(true);
          } else {
            alert(result.error || result.detail || "解析失败");
          }
        } catch (error) {
          alert("上传失败: " + (error as Error).message);
        }
        break;
      }
    }
  }, []);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${API_BASE}/api/jd/analyze`, {
        method: "POST",
        headers: getUserHeaders(),
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setConfirmData(result.data);
        setConfirmModalOpen(true);
      } else {
        alert(result.error || result.detail || "解析失败");
      }
    } catch (error) {
      alert("上传失败: " + (error as Error).message);
    }

    if (e.target) e.target.value = "";
  };

  const handleFileAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/jd/analyze-file`, {
        method: "POST",
        headers: getUserHeaders(),
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        if (json.data?.type === "structured") {
          alert(`导入完成！成功: ${json.data.imported} 条，跳过: ${json.data.skipped} 条`);
          queryClient.invalidateQueries({ queryKey: ["applications"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          queryClient.invalidateQueries({ queryKey: ["filter-options"] });
          queryClient.invalidateQueries({ queryKey: ["all-apps-names"] });
        } else {
          setConfirmData(json.data);
          setConfirmModalOpen(true);
        }
      } else {
        alert(json.error || json.detail || "文件分析失败");
      }
    } catch (err) {
      alert("上传失败: " + (err as Error).message);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert(`不支持的文件格式: ${ext}\n请上传 CSV 或 Excel 文件`);
      if (e.target) e.target.value = "";
      return;
    }

    setCsvImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/import/csv`, {
        method: "POST",
        headers: getUserHeaders(),
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        const imported = json.data?.imported ?? json.data?.count ?? 0;
        const skipped = json.data?.skipped ?? 0;
        alert(`导入完成！成功: ${imported} 条，跳过: ${skipped} 条`);
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["filter-options"] });
        queryClient.invalidateQueries({ queryKey: ["all-apps-names"] });
      } else {
        alert(json.error || json.detail || "CSV导入失败");
      }
    } catch (err) {
      alert("导入失败: " + (err as Error).message);
    } finally {
      setCsvImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRowClick = (app: ApplicationItem) => {
    setSelectedApp(app);
    setEditingRecord(app);
    setRecordForm({
      company_name: app.company_name || "",
      position: app.position || "",
      city: app.city || "",
      status: app.status || "已投递",
      channel: app.channel || "",
      apply_date: app.apply_date || "",
      salary_range: app.salary_range || "",
      company_size: app.company_size || "",
      company_tier: app.company_tier || "",
      jd_text: app.jd_text || "",
    });
    setRecordModalOpen(true);
  };

  const cityData = stats
    ? Object.entries(stats.city_distribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  const statusCount = stats?.status_distribution || {};
  const interviewing = statusCount["面试中"] || 0;
  const rejected = statusCount["已拒绝"] || 0;

  const companyTierData = stats
    ? TIER_ORDER
        .filter((tier) => stats.company_tier_distribution?.[tier])
        .map((tier) => ({ name: tier, value: stats.company_tier_distribution[tier] }))
    : [];

  const matchScoreData = stats
    ? Object.entries(stats.match_score_distribution)
        .map(([name, value]) => ({ name, value }))
    : [];

  const timelineData = stats?.timeline || [];

  const monthlyTrendData = stats?.monthly_trend || [];
  const channelData = stats
    ? Object.entries(stats.channel_distribution || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];
  const topMatches = stats?.top_matches || [];
  const funnelData = stats?.funnel_data
    ? [
        { name: "投递成功", value: stats.funnel_data.applications },
        { name: "简历查看", value: stats.funnel_data.views },
        { name: "沟通面试", value: stats.funnel_data.interviews },
        { name: "获得Offer", value: stats.funnel_data.offers },
        { name: "录用入职", value: stats.funnel_data.accepts },
      ]
    : [];

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      company_name: "",
      position: "",
      city: "",
      status: "",
      channel: "",
      match_score_min: "",
      match_score_max: "",
      company_size: "",
      company_tier: "",
      date_from: "",
      date_to: "",
      keyword: "",
    });
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    setSort((prev) => ({
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === "desc" ? "asc" : "desc",
    }));
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sort.sort_by !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sort.sort_order === "desc" ? (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    );
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

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
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium">
            <LayoutDashboard className="w-5 h-5" />
            数据看板
          </button>
          <button
            onClick={() => router.push("/companies")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
          >
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
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>设置</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="api-key">MiniMax API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="请输入 API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <div className="grid gap-2 mt-2">
                  <Label>大模型版本 (请输入模型名称，如 MiniMax-Text-01)</Label>
                  <Input
                    placeholder="输入大模型版本名称"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => saveApiKeyMutation.mutate({ key: apiKey, model: modelName })}
                    disabled={!apiKey || saveApiKeyMutation.isPending}
                    className="flex-1"
                  >
                    {saveApiKeyMutation.isPending ? "保存中..." : "保存配置"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testApiKeyMutation.mutate()}
                    disabled={!apiKeyStatus?.configured || testApiKeyMutation.isPending}
                    className="flex-1"
                  >
                    测试连接
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("确定要删除并重置您的 API Key 吗？")) {
                        clearApiKeyMutation.mutate();
                      }
                    }}
                    disabled={clearApiKeyMutation.isPending || !apiKeyStatus?.configured}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                  >
                    清除重置
                  </Button>
                </div>
                <div className="border-t border-gray-200 pt-4 grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resume-profile" className="flex items-center gap-2">
                      我的简历背景
                      {resumeProfileStatus?.configured && (
                        <span className="text-xs text-emerald-600 font-normal">已配置</span>
                      )}
                    </Label>
                    <div className="flex gap-1">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.docx,.txt,.md"
                        onChange={handleResumeUpload}
                        className="hidden"
                        id="resume-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => document.getElementById("resume-upload")?.click()}
                        disabled={resumeUploading}
                      >
                        {resumeUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : null}
                        上传简历
                      </Button>
                    </div>
                  </div>
                  <textarea
                    id="resume-profile"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    placeholder="例如：有 3 年经验的 AI 产品经理，熟悉大模型、产品设计、数据分析"
                    value={resumeProfile}
                    onChange={(e) => setResumeProfile(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    设置后，AI 会根据此背景评估 JD 匹配度。留空则使用默认背景。
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveResumeProfileMutation.mutate(resumeProfile)}
                      className="flex-1"
                      disabled={saveResumeProfileMutation.isPending}
                    >
                      {saveResumeProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "保存简历背景"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setResumeProfile("")}>
                      清除
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 grid gap-2">
                  <Label>自定义评分 Prompt</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    placeholder="如果不填，将使用系统默认 Prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                  <div className="flex gap-2 mt-1">
                    <Button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_BASE}/api/settings/custom-prompt`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...getUserHeaders() },
                            body: JSON.stringify({ prompt: customPrompt })
                          });
                          if (res.ok) alert("自定义 Prompt 保存成功");
                        } catch {
                          alert("保存失败");
                        }
                      }}
                      className="flex-1"
                    >
                      保存自定义指令
                    </Button>
                    <Button variant="outline" onClick={() => setCustomPrompt("")}>清除</Button>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 grid gap-3">
                  <Label className="flex items-center gap-2">
                    用户管理
                    <span className="text-xs text-gray-500 font-normal">当前: {currentUser}</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="新用户名称"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newUserName.trim()) {
                          addUser(newUserName.trim());
                          setNewUserName("");
                          setCurrentUser(newUserName.trim());
                          window.location.reload();
                        }
                      }}
                    >
                      新建用户
                    </Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={getCurrentUserId()}
                      onValueChange={(value) => {
                        switchUser(value);
                        setCurrentUser(getCurrentUserName());
                        window.location.reload();
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="切换用户" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllUsers().map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {user.id === getCurrentUserId() ? "(当前)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={getCurrentUserId() === "default"}
                      onClick={() => {
                        if (window.confirm(`确定要删除用户 "${getCurrentUserName()}" 吗？\n\n该用户的所有数据将被删除，且不可恢复！`)) {
                          deleteUser(getCurrentUserId());
                          setCurrentUser(getCurrentUserName());
                          window.location.reload();
                        }
                      }}
                    >
                      删除当前用户
                    </Button>
                  </div>
                </div>
                <div className="border-t border-red-200 pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (window.confirm("确定要清除所有数据吗？\n\n将删除：所有投递记录、批量任务、简历背景\n保留：API Key\n\n此操作不可恢复！")) {
                        clearDataMutation.mutate();
                      }
                    }}
                    disabled={clearDataMutation.isPending}
                  >
                    {clearDataMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "清除所有数据"
                    )}
                  </Button>
                  <p className="text-[10px] text-gray-400 mt-1">删除所有投递记录，保留 API Key</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <Settings className="w-5 h-5" />
            设置
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-800">数据看板</h1>
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setEditingRecord(null);
                setRecordForm({
                  company_name: "", position: "", city: "", status: "已投递",
                  channel: "", apply_date: new Date().toISOString().slice(0, 10), salary_range: "",
                  company_size: "", company_tier: "", jd_text: "",
                });
                setRecordModalOpen(true);
              }}
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <PlusCircle className="w-4 h-4" />
              新建记录
            </Button>
            <Button
              variant="outline"
              onClick={() => setExportModalOpen(true)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              导出报表
            </Button>
            <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
              id="csv-import"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("csv-import")?.click()}
              className="gap-2"
              disabled={csvImporting}
            >
              {csvImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
              导入CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setBatchPanelOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              批量上传
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.docx,.txt,.md,.png,.jpg,.jpeg"
              onChange={handleFileAnalyze}
              className="hidden"
              id="file-analyze"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("file-analyze")?.click()}
              className="gap-2"
            >
              <FileUp className="w-4 h-4" />
              智能分析
            </Button>
            <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
            <Button
              variant="outline"
              className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100"
              onClick={handleStartBatchScore}
              disabled={unscoredCount === 0 || scoringStarted}
            >
              <Bot className="w-4 h-4" />
              智能批量分析 ({unscoredCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilterOpen(true)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              筛选
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </Button>
          </div>
        </header>

        {/* 顶部 AI 进度 Banner */}
      {scoreTaskId && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className={`w-5 h-5 text-blue-600 ${scoreTaskStatus?.status === 'processing' || scoringStarted ? 'animate-bounce' : ''}`} />
            <div>
              <div className="text-sm font-medium text-blue-900">
                AI 智能分析中
                {scoreTaskStatus?.status === 'completed' && ' (已完成)'}
                {scoreTaskStatus?.status === 'failed' && ' (异常中断)'}
              </div>
              <div className="text-xs text-blue-600">
                {scoringStarted && !scoreTaskStatus ? "正在唤醒大模型..." : ""}
                {scoreTaskStatus && (
                  <span>进度: {scoreTaskStatus.completed} / {scoreTaskStatus.total} {scoreTaskStatus.failed > 0 && <span className="text-red-500 ml-2">失败: {scoreTaskStatus.failed}</span>}</span>
                )}
              </div>
            </div>
          </div>
          {scoreTaskStatus && (
            <div className="flex items-center gap-4 w-64">
              <div className="h-2 w-full bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                  style={{ width: `${scoreTaskStatus.total ? (scoreTaskStatus.completed + scoreTaskStatus.failed) / scoreTaskStatus.total * 100 : 0}%` }}
                ></div>
              </div>
              {scoreTaskStatus.status === 'completed' && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-700" onClick={() => setScoreTaskId(null)}>关闭</Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
          <div
            onPaste={handlePaste}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            tabIndex={0}
          >
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-500">点击后按 Ctrl+V 粘贴 JD 截图</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">或</span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-blue-600 hover:text-blue-700 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  imageInputRef.current?.click();
                }}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                选择图片
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-16 mb-2" />
                  <div className="h-8 bg-gray-100 rounded w-12" />
                </div>
              ))}
            </div>
          ) : statsError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 mb-2">加载统计数据失败</p>
              <Button variant="outline" size="sm" onClick={() => refetchStats()}>
                重试
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                  title="总投递数"
                  value={stats?.total || 0}
                  icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                  bgColor="bg-blue-50"
                />
                <StatCard
                  title="面试中"
                  value={interviewing}
                  icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
                  bgColor="bg-amber-50"
                />
                <StatCard
                  title="已拒绝"
                  value={rejected}
                  icon={<Building2 className="w-5 h-5 text-red-600" />}
                  bgColor="bg-red-50"
                />
                <StatCard
                  title="平均匹配度"
                  value={`${stats?.match_score_avg || 0}%`}
                  icon={<MapPin className="w-5 h-5 text-emerald-600" />}
                  bgColor="bg-emerald-50"
                />
                <StatCard
                  title="已回复率"
                  value={`${stats?.response_rate || 0}%`}
                  icon={<MessageCircleReply className="w-5 h-5 text-indigo-600" />}
                  bgColor="bg-indigo-50"
                />
                <StatCard
                  title="覆盖公司"
                  value={stats?.companies_covered || 0}
                  icon={<Layers className="w-5 h-5 text-purple-600" />}
                  bgColor="bg-purple-50"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <ChartCard title="城市分布" className="min-w-0">
                  <div className="flex items-center justify-end mb-2 gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={cityChartMax === "auto" ? "" : cityChartMax}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCityChartMax(val === "" ? "auto" : Number(val));
                      }}
                      placeholder="自动"
                      className="w-20 h-8 text-xs"
                    />
                    <div className="flex gap-1">
                      {["auto", 5, 10, 20, 50].map((v) => (
                        <button
                          key={String(v)}
                          onClick={() => setCityChartMax(v === "auto" ? "auto" : Number(v))}
                          className={cn(
                            "px-2 py-1 text-xs rounded border transition-colors",
                            cityChartMax === v
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {v === "auto" ? "自动" : `0-${v}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-64 w-full" style={{ minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={cityChartMax === "auto" ? [0, "auto"] : [0, cityChartMax]}
                          tick={{ fontSize: 11 }}
                          label={{ value: "投递数", position: "bottom", offset: -5, style: { fontSize: 12, fill: "#6b7280" } }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={50}
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {cityData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="投递进度分布" className="min-w-0">
                  <div className="h-64 w-full" style={{ minWidth: 200, marginTop: "2rem" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(stats?.status_distribution || {}).map(([name, value]) => ({
                          name,
                          value,
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {Object.entries(stats?.status_distribution || {}).map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <ChartCard title="公司档次分布" className="min-w-0">
                  <div className="h-52 w-full" style={{ minWidth: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={companyTierData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {companyTierData.map((entry) => (
                            <Cell key={entry.name} fill={TIER_COLORS[entry.name] || "#9ca3af"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="匹配度分布" className="min-w-0">
                  <div className="h-52 w-full" style={{ minWidth: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={matchScoreData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {matchScoreData.map((_, index) => (
                            <Cell key={index} fill={MATCH_COLORS[index % MATCH_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="投递时间线" className="min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">最高值(Y轴):</span>
                      <Input
                        type="number" min={1} max={999}
                        value={timelineMax === "auto" ? "" : timelineMax}
                        onChange={(e) => setTimelineMax(e.target.value === "" ? "auto" : Number(e.target.value))}
                        placeholder="自动" className="w-16 h-7 text-xs"
                      />
                      {filters.date_from && filters.date_from === filters.date_to && (
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, date_from: "", date_to: "" }));
                            setCurrentPage(1);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 ml-2"
                        >
                          清除日期筛选
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>&lt;</Button>
                      <div className="font-bold text-sm flex items-center">{calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 1}月</div>
                      <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>&gt;</Button>
                    </div>
                  </div>
                  {/* 月历网格 */}
                  <div className="w-full bg-white rounded-md border p-2 mb-2 text-xs">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-gray-500 font-medium pb-1">{d}</div>)}
                      {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="h-7"></div>)}
                      {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const count = timelineData.find((t: { date: string; count: number }) => t.date === dateStr)?.count || 0;
                        return (
                          <div
                            key={dateStr}
                            onClick={() => {
                              if (filters.date_from === dateStr && filters.date_to === dateStr) {
                                setFilters(prev => ({ ...prev, date_from: "", date_to: "" }));
                              } else if (!filters.date_from || (filters.date_from && filters.date_to && filters.date_from !== filters.date_to)) {
                                setFilters(prev => ({ ...prev, date_from: dateStr, date_to: dateStr }));
                              } else {
                                const from = new Date(filters.date_from);
                                const curr = new Date(dateStr);
                                if (curr < from) {
                                  setFilters(prev => ({ ...prev, date_from: dateStr, date_to: filters.date_from }));
                                } else {
                                  setFilters(prev => ({ ...prev, date_to: dateStr }));
                                }
                              }
                              setCurrentPage(1);
                            }}
                            className={cn(
                              "h-7 flex items-center justify-center rounded cursor-pointer transition-all",
                              (filters.date_from && filters.date_to && dateStr >= filters.date_from && dateStr <= filters.date_to) ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50 text-blue-700 font-medium" : "hover:ring-1 hover:ring-gray-300",
                              count > 0 ? ((filters.date_from && filters.date_to && dateStr >= filters.date_from && dateStr <= filters.date_to) ? "bg-blue-600 text-white font-bold" : "bg-blue-100 text-blue-700 font-bold shadow-sm") : ""
                            )}
                            title={`${dateStr}: ${count} 次投递 (点击筛选)`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="h-40 w-full" style={{ minWidth: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => typeof v === "string" ? v.slice(5) : v}
                        />
                        <YAxis domain={timelineMax === "auto" ? [0, "auto"] : [0, timelineMax]} tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(v) => `日期: ${v}`} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 items-start">
                <ChartCard title="月度投递趋势" className="min-w-0">
                  <div className="h-64 w-full" style={{ minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="投递渠道分布" className="min-w-0">
                  <div className="h-64 w-full" style={{ minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={true}
                        >
                          {channelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
                <ChartCard title="求职转化漏斗" className="lg:col-span-2 min-w-0">
                  <div className="h-64 w-full flex items-center justify-center pt-4" style={{ minWidth: 200 }}>
                    <div className="w-full max-w-lg space-y-2">
                      {funnelData.filter(stage => stage.value > 0).map((stage, idx) => {
                        const total = funnelData[0]?.value || 1;
                        const percentage = total > 0 ? (stage.value / total) * 100 : 0;
                        const widthStr = `${Math.max(percentage, 10)}%`;
                        const color = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'][idx % 5];
                        return (
                          <div key={stage.name} className="flex flex-col items-center group">
                            <div className="w-full flex justify-between text-xs text-gray-500 px-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>{stage.name}</span>
                              <span>{stage.value} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div 
                              className={`h-8 rounded-sm ${color} transition-all duration-500 flex items-center justify-center text-white text-xs font-medium shadow-sm cursor-default hover:brightness-110`}
                              style={{ width: widthStr }}
                              title={`${stage.name}: ${stage.value} (${percentage.toFixed(1)}%)`}
                            >
                              {percentage > 15 ? `${stage.name} ${stage.value}` : stage.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="高优匹配 TOP 10" className="min-w-0">
                  <div className="h-64 w-full overflow-y-auto pr-2 custom-scrollbar">
                    {topMatches.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无匹配数据</div>
                    ) : (
                      <div className="space-y-3">
                        {topMatches.map((match, idx) => (
                          <div 
                            key={match.id} 
                            onClick={() => {
                              const found = applications.find((a: ApplicationItem) => a.id === match.id);
                              if(found) {
                                setSelectedApp(found);
                                setDetailModalOpen(true);
                              } else {
                                setSelectedApp(match as unknown as ApplicationItem);
                                setDetailModalOpen(true);
                              }
                            }}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors group"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${idx < 3 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">{match.company_name}</div>
                              <div className="text-xs text-gray-500 truncate">{match.position}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold text-emerald-600">{match.match_score}分</div>
                              <div className="text-[10px] text-gray-400">{match.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ChartCard>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">投递记录</h3>
              <span className="text-sm text-gray-500">共 {totalCount} 条</span>
            </div>
            {appsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            ) : appsError ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p className="text-red-600 text-sm mb-2">加载投递记录失败</p>
                <Button variant="outline" size="sm" onClick={() => refetchApps()}>
                  重试
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {SORTABLE_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-blue-600 select-none"
                            onClick={() => handleSort(col.key)}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              <SortIcon field={col.key} />
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left font-medium text-gray-600">公司档次</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">薪资</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                            暂无数据
                          </td>
                        </tr>
                      ) : (
                        applications.map((app) => (
                          <tr
                            key={app.id}
                            className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer"
                            onClick={() => handleRowClick(app)}
                          >
                            <td className="px-4 py-3 font-medium text-gray-800">{app.company_name}</td>
                            <td className="px-4 py-3 text-gray-600">{app.position}</td>
                            <td className="px-4 py-3 text-gray-600">{app.city || "-"}</td>
                            <td className="px-4 py-3">
                              <MatchScore score={app.match_score} />
                            </td>
                            <td className="px-4 py-3 text-gray-600">{app.apply_date || "-"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <TierBadge tier={app.company_tier} />
                                {app.company_size && (
                                  <span className="text-xs text-gray-400">（{app.company_size}）</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{app.salary_range || "-"}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={app.status} />
                            </td>
                            <td className="px-4 py-3">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); handleSingleScore(app.id); }}
                                title="重新检测匹配度"
                              >
                                <Bot className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      第 {currentPage} / {totalPages} 页
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        下一页
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>筛选条件</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2">
              <Label>企业名称（按城市分组）</Label>
              <div className="relative z-10">
                <AccordionCompanySelect
                  value={filters.company_name}
                  onChange={(v) => handleFilterChange("company_name", v)}
                  companyByCity={filterOptions.companyByCity}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>岗位</Label>
              <Input
                placeholder="模糊搜索"
                value={filters.position}
                onChange={(e) => handleFilterChange("position", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>城市</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.city}
                onChange={(e) => handleFilterChange("city", e.target.value)}
              >
                <option value="">全部</option>
                {filterOptions.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>投递进度</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">全部</option>
                {filterOptions.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>投递渠道</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.channel}
                onChange={(e) => handleFilterChange("channel", e.target.value)}
              >
                <option value="">全部</option>
                {filterOptions.channels.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>公司档次</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filters.company_tier}
                onChange={(e) => handleFilterChange("company_tier", e.target.value)}
              >
                <option value="">全部</option>
                {TIER_ORDER.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>匹配度范围</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="最小"
                  type="number"
                  value={filters.match_score_min}
                  onChange={(e) => handleFilterChange("match_score_min", e.target.value)}
                  className="w-20"
                />
                <span className="text-gray-400">-</span>
                <Input
                  placeholder="最大"
                  type="number"
                  value={filters.match_score_max}
                  onChange={(e) => handleFilterChange("match_score_max", e.target.value)}
                  className="w-20"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>JD关键词</Label>
              <Input
                placeholder="搜索JD文本内容"
                value={filters.keyword}
                onChange={(e) => handleFilterChange("keyword", e.target.value)}
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  投递起始日期
                </Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange("date_from", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  投递截止日期
                </Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange("date_to", e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setFilterOpen(false)} className="flex-1">
              应用筛选
            </Button>
            <Button variant="outline" onClick={resetFilters} className="gap-1">
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={batchPanelOpen} onOpenChange={setBatchPanelOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>批量上传</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleBatchUpload}
                className="hidden"
                id="batch-upload"
              />
              <label
                htmlFor="batch-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">点击选择多张图片</span>
              </label>
            </div>

            {batchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-auto">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    进度: {batchStatus?.completed || 0}/{batchStatus?.total || batchResults.length}
                  </span>
                  <span>
                    失败: {batchStatus?.failed || 0}
                  </span>
                </div>
                {batchResults.map((result) => (
                  <div
                    key={result.index}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      {result.status === "completed" ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : result.status === "failed" ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : result.status === "processing" ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <span className="text-sm flex-1">图片 {result.index + 1}</span>
                    <span className="text-xs text-gray-500">
                      {result.status === "completed"
                        ? "已完成"
                        : result.status === "failed"
                        ? "失败"
                        : result.status === "processing"
                        ? "处理中"
                        : "等待中"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>确认解析结果</DialogTitle>
          </DialogHeader>
          {confirmData && (
            <div className="py-4 space-y-4">
              <ConfirmField
                label="公司名称"
                value={confirmData.company_name || ""}
                onChange={(v) => setConfirmData({ ...confirmData, company_name: v })}
              />
              <ConfirmField
                label="岗位"
                value={confirmData.position || ""}
                onChange={(v) => setConfirmData({ ...confirmData, position: v })}
              />
              <ConfirmField
                label="城市"
                value={confirmData.city || ""}
                onChange={(v) => setConfirmData({ ...confirmData, city: v })}
              />
              <ConfirmField
                label="公司规模"
                value={confirmData.company_size || ""}
                onChange={(v) => setConfirmData({ ...confirmData, company_size: v })}
              />
              <ConfirmField
                label="公司档次"
                value={confirmData.company_tier || ""}
                onChange={(v) => setConfirmData({ ...confirmData, company_tier: v })}
              />
              <ConfirmField
                label="薪资范围"
                value={confirmData.salary_range || ""}
                onChange={(v) => setConfirmData({ ...confirmData, salary_range: v })}
              />
              <ConfirmField
                label="学历要求"
                value={confirmData.education || ""}
                onChange={(v) => setConfirmData({ ...confirmData, education: v })}
              />
              <ConfirmField
                label="工作年限"
                value={confirmData.experience || ""}
                onChange={(v) => setConfirmData({ ...confirmData, experience: v })}
              />
              <ConfirmField
                label="匹配度评分"
                value={String(confirmData.match_score || "")}
                onChange={(v) => setConfirmData({ ...confirmData, match_score: parseInt(v) || 0 })}
              />
              <div className="grid gap-2">
                <Label>技能标签</Label>
                <Input
                  value={(confirmData.skills || []).join(", ")}
                  onChange={(e) =>
                    setConfirmData({
                      ...confirmData,
                      skills: e.target.value.split(",").map((s: string) => s.trim()),
                    })
                  }
                  placeholder="用逗号分隔"
                />
              </div>
              <div className="grid gap-2">
                <Label>JD 文本</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                  value={confirmData.jd_text || ""}
                  onChange={(e) => setConfirmData({ ...confirmData, jd_text: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => confirmMutation.mutate(confirmData)}
                  className="flex-1"
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "保存到数据库"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedApp?.company_name}</span>
              <span className="text-gray-400 font-normal">·</span>
              <span className="text-gray-600 font-normal text-base">{selectedApp?.position}</span>
              <span className="text-gray-400 font-normal">·</span>
              <span className="text-gray-500 font-normal text-base">{selectedApp?.city}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <TierBadge tier={selectedApp.company_tier} />
                {selectedApp.company_size && (
                  <span className="text-sm text-gray-500">（{selectedApp.company_size}）</span>
                )}
                <StatusBadge status={selectedApp.status} />
                {selectedApp.match_score > 0 && (
                  <span className="flex items-center gap-1 text-sm">
                    <span className="text-gray-500">匹配度:</span>
                    <MatchScore score={selectedApp.match_score} />
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedApp.salary_range && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">薪资:</span>
                    <span className="font-medium text-gray-800">{selectedApp.salary_range}</span>
                  </div>
                )}
                {selectedApp.education && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">学历:</span>
                    <span className="font-medium text-gray-800">{selectedApp.education}</span>
                  </div>
                )}
                {selectedApp.experience && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">经验:</span>
                    <span className="font-medium text-gray-800">{selectedApp.experience}</span>
                  </div>
                )}
                {selectedApp.channel && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">渠道:</span>
                    <span className="font-medium text-gray-800">{selectedApp.channel}</span>
                  </div>
                )}
                {selectedApp.apply_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">投递日期:</span>
                    <span className="font-medium text-gray-800">{selectedApp.apply_date}</span>
                  </div>
                )}
              </div>

              {selectedApp.skills && selectedApp.skills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-500">技能标签</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.jd_text && (
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-500">JD 全文</span>
                  <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                      {selectedApp.jd_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 批量评分进度弹窗 */}
      <Dialog open={scoreModalOpen} onOpenChange={(open) => { setScoreModalOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              批量 AI 评分
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {!scoreTaskId ? (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium mb-1">
                    共 <span className="font-bold text-amber-600">{unscoredCount}</span> 条记录尚未评分
                  </p>
                  <p className="text-xs text-amber-600">
                    AI 将综合「岗位名称、公司规模、JD 详情」与你的简历背景，为每条记录生成 0-100 的匹配度评分。
                    无 JD 文本的记录将基于岗位+公司名兜底评估。
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                  <p>· 预计耗时：约 {Math.ceil(unscoredCount * 0.5 / 60)} 分钟（每条 ~0.5 秒）</p>
                  <p>· 消耗 Token：约 {unscoredCount * 500}（每条约 500 tokens）</p>
                  <p>· 评分在后台运行，关闭此窗口不影响进度</p>
                </div>
                <Button
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleStartBatchScore}
                  disabled={scoringStarted}
                >
                  {scoringStarted ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {scoringStarted ? "启动中..." : "开始批量评分"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">评分进度</span>
                    <span className="font-medium text-gray-800">
                      {scoreTaskStatus?.completed ?? 0} / {scoreTaskStatus?.total ?? 0}
                      {scoreTaskStatus?.failed ? (
                        <span className="text-red-500 ml-2">（失败 {scoreTaskStatus.failed}）</span>
                      ) : null}
                    </span>
                  </div>
                  {/* 进度条 */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: scoreTaskStatus?.total
                          ? `${Math.round(((scoreTaskStatus.completed ?? 0) / scoreTaskStatus.total) * 100)}%`
                          : "0%",
                        background: scoreTaskStatus?.status === "completed"
                          ? "linear-gradient(90deg, #10b981, #059669)"
                          : "linear-gradient(90deg, #f59e0b, #d97706)",
                      }}
                    />
                  </div>
                  {scoreTaskStatus?.status === "completed" ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        评分完成！成功 {scoreTaskStatus.completed} 条，图表数据已自动刷新
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI 正在逐条分析匹配度，请稍候...</span>
                    </div>
                  )}
                  {scoreTaskStatus?.errors?.length > 0 && (
                    <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2 max-h-20 overflow-auto">
                      {scoreTaskStatus.errors.slice(0, 3).map((e: string, i: number) => (
                        <p key={i}>{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 导出报表弹窗 */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              导出 Excel 报表
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>请选择要导出的数据表（Sheet）</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries({
                  records: "投递明细记录",
                  city: "城市分布统计",
                  status: "状态漏斗分析",
                  tier: "公司档次分布",
                  score: "匹配度分布"
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={exportSheets[key as keyof typeof exportSheets]}
                      onChange={(e) => setExportSheets(s => ({ ...s, [key]: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => {
                const sheets = Object.entries(exportSheets).filter(([, v]) => v).map(([k]) => k).join(",");
                window.open(`${API_BASE}/api/export/xlsx?sheets=${sheets}`, "_blank");
                setExportModalOpen(false);
              }}
              disabled={!Object.values(exportSheets).some(Boolean)}
            >
              <Download className="w-4 h-4" />
              下载 Excel 文件
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新建/编辑记录弹窗 */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "编辑投递记录" : "新建投递记录"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ConfirmField label="公司名称 *" value={recordForm.company_name} onChange={v => setRecordForm(s => ({...s, company_name: v}))} />
              <ConfirmField label="岗位 *" value={recordForm.position} onChange={v => setRecordForm(s => ({...s, position: v}))} />
              <ComboboxField label="城市" value={recordForm.city} options={filterOptions.cities} onChange={v => setRecordForm(s => ({...s, city: v}))} />
              <div className="grid gap-2">
                <Label>投递状态</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={recordForm.status}
                  onChange={(e) => setRecordForm(s => ({...s, status: e.target.value}))}
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>投递日期</Label>
                <Input type="date" value={recordForm.apply_date} onChange={(e) => setRecordForm(s => ({...s, apply_date: e.target.value}))} />
              </div>
              <ComboboxField label="渠道" value={recordForm.channel} options={filterOptions.channels} onChange={v => setRecordForm(s => ({...s, channel: v}))} />
              <ConfirmField label="薪资范围" value={recordForm.salary_range} onChange={v => setRecordForm(s => ({...s, salary_range: v}))} />
              <div className="grid gap-2">
                <Label>公司档次</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={recordForm.company_tier}
                  onChange={(e) => setRecordForm(s => ({...s, company_tier: e.target.value}))}
                >
                  <option value="">未指定</option>
                  {TIER_ORDER.map(t => <option key={t} value={t}>{t} {TIER_DESCRIPTIONS[t]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>JD 文本（用于匹配度分析）</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={recordForm.jd_text}
                onChange={(e) => setRecordForm(s => ({...s, jd_text: e.target.value}))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={async () => {
                  if (!recordForm.company_name || !recordForm.position) return alert("公司和岗位必填");
                  try {
                    const method = editingRecord ? "PUT" : "POST";
                    const url = editingRecord 
                      ? `${API_BASE}/api/applications/${editingRecord.id}`
                      : `${API_BASE}/api/applications`;
                    const res = await fetch(url, {
                      method,
                      headers: { "Content-Type": "application/json", ...getUserHeaders() },
                      body: JSON.stringify(recordForm)
                    });
                    if (res.ok) {
                      setRecordModalOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["applications"] });
                      queryClient.invalidateQueries({ queryKey: ["stats"] });
                      refetchUnscored();
                    } else alert("保存失败");
                  } catch { alert("请求失败"); }
                }}
              >
                保存
              </Button>
              {editingRecord && (
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm("确定删除该记录吗？")) return;
                    try {
                      const res = await fetch(`${API_BASE}/api/applications/${editingRecord.id}`, { method: "DELETE", headers: getUserHeaders() });
                      if (res.ok) {
                        setRecordModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ["applications"] });
                        queryClient.invalidateQueries({ queryKey: ["stats"] });
                      }
                    } catch {}
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> 删除
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    已投递: "bg-blue-100 text-blue-700",
    面试中: "bg-amber-100 text-amber-700",
    已拒绝: "bg-red-100 text-red-700",
    已offer: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (!tier) return null;
  const color = TIER_COLORS[tier] || "#9ca3af";
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {tier}
    </span>
  );
}

function MatchScore({ score }: { score: number }) {
  if (!score) return <span className="text-gray-400">-</span>;
  const color =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-blue-600" : "text-amber-600";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

function ConfirmField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ComboboxField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-2 relative">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
      />
      {open && options.length > 0 && (
        <ul className="absolute top-full left-0 z-50 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-md mt-1">
          {options.map(o => (
            <li
              key={o}
              className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false); }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
