/**
 * useChartExport - 为 Recharts 图表提供 SVG / PNG / JPG 导出能力
 *
 * 用法：
 *   const { exportChart, containerRef } = useChartExport("城市分布");
 *   <div ref={containerRef}><BarChart ...></BarChart></div>
 *   <button onClick={() => exportChart("png")}>下载PNG</button>
 */
import { useRef } from "react";

type ExportFormat = "svg" | "png" | "jpg";

export function useChartExport(chartName: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  const exportChart = async (format: ExportFormat = "png") => {
    const container = containerRef.current;
    if (!container) return;

    const svgEl = container.querySelector("svg");
    if (!svgEl) {
      alert("未找到图表 SVG 元素");
      return;
    }

    const filename = `${chartName}_${new Date().toISOString().slice(0, 10)}`;

    if (format === "svg") {
      //直接序列化 SVG 下载前，增加标题支持
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      
      const svgWidth = clone.viewBox.baseVal?.width || clone.width.baseVal?.value || 600;
      const svgHeight = clone.viewBox.baseVal?.height || clone.height.baseVal?.value || 400;
      const titleHeight = 40;
      
      clone.setAttribute("height", `${svgHeight + titleHeight}`);
      if (clone.getAttribute("viewBox")) {
          const parts = clone.getAttribute("viewBox")!.split(" ").map(Number);
          if (parts.length === 4) {
              clone.setAttribute("viewBox", `0 0 ${parts[2]} ${parts[3] + titleHeight}`);
          }
      }
      
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(0, ${titleHeight})`);
      while (clone.firstChild) {
          g.appendChild(clone.firstChild);
      }
      clone.appendChild(g);
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "10");
      text.setAttribute("y", "24");
      text.setAttribute("font-family", "sans-serif");
      text.setAttribute("font-size", "16");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("fill", "#374151");
      text.textContent = chartName;
      clone.appendChild(text);

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(clone);
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      triggerDownload(blob, `${filename}.svg`);
      return;
    }

    // PNG / JPG：通过 Canvas 转换
    const { width, height } = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // 内联计算样式，确保跨域渲染正确
    clone.style.background = "#ffffff";
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // 2x 高清
      const titleHeight = 40;
      canvas.width = (width || 600) * scale;
      canvas.height = ((height || 400) + titleHeight) * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#374151";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(chartName, 10, 24);
      
      ctx.drawImage(img, 0, titleHeight, width || 600, height || 400);
      URL.revokeObjectURL(url);

      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, `${filename}.${format}`);
      }, mimeType, 0.95);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("图表导出失败，请尝试 SVG 格式");
    };
    img.src = url;
  };

  return { exportChart, containerRef };
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
