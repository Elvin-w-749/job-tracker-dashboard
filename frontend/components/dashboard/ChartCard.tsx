"use client";

import { useState, useRef } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartExport } from "@/hooks/useChartExport";

// ─── 手风琴城市-公司选择器 ─────────────────────────────────────────────────

interface AccordionCompanySelectProps {
  value: string;
  onChange: (value: string) => void;
  companyByCity: Record<string, string[]>;
}

export function AccordionCompanySelect({ value, onChange, companyByCity }: AccordionCompanySelectProps) {
  const [openCities, setOpenCities] = useState<Set<string>>(new Set());

  const toggleCity = (city: string) => {
    setOpenCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const cities = Object.keys(companyByCity).sort();

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
      {/* 全部选项 */}
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(
          "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
          value === "" && "bg-blue-50 text-blue-700 font-medium"
        )}
      >
        全部城市
      </button>

      {cities.map(city => {
        const companies = companyByCity[city] || [];
        const isOpen = openCities.has(city);
        const citySelected = companies.some(c => c === value);

        return (
          <div key={city}>
            {/* 城市标题行 */}
            <button
              type="button"
              onClick={() => toggleCity(city)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors",
                citySelected ? "text-blue-700" : "text-gray-700"
              )}
            >
              <span className="flex items-center gap-1.5">
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                )}
                {city}
                <span className="text-xs text-gray-400 font-normal">({companies.length})</span>
              </span>
            </button>

            {/* 公司列表（展开时显示） */}
            {isOpen && (
              <div className="bg-gray-50/60">
                {companies.map(company => (
                  <button
                    key={company}
                    type="button"
                    onClick={() => onChange(value === company ? "" : company)}
                    className={cn(
                      "w-full text-left pl-8 pr-3 py-1.5 text-sm hover:bg-gray-100 transition-colors",
                      value === company ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600"
                    )}
                  >
                    {company}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 图表卡片包装器（含下载按钮） ─────────────────────────────────────────

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  const { exportChart, containerRef } = useChartExport(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 shadow-sm p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="下载图表"
          >
            <Download className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32">
              {(["svg", "png", "jpg"] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => { exportChart(fmt); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700"
                >
                  下载 {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div ref={containerRef}>
        {children}
      </div>
    </div>
  );
}
