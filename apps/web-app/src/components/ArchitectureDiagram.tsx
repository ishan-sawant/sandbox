import { motion, AnimatePresence } from "motion/react";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  Activity, 
  LayoutDashboard, 
  Info,
  Layers,
  Code,
  AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import DIAGRAM_URL from "../assets/images/Untitled-2026-05-16-2229.svg";
import { getPinchTouchMetrics } from "../lib/touchMetrics";
import { isMetricsLimitKey, metricsGradientId, metricsStrokeColor } from "../lib/metricsChart";
import { POLL_INTERVAL_MS, isStale, shouldPoll } from "../lib/metricsPolling";
import { SectionHeader } from "./SectionHeader";
import { TabPanel } from "./TabPanel";

export const ArchitectureDiagram = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoomContainer, setZoomContainer] = useState<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagram" | "metrics">("diagram");
  const [showRawJson, setShowRawJson] = useState(false);

  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [transitioningBack, setTransitioningBack] = useState(false);
  const isZoomingRef = useRef(false);
  const touchStartRef = useRef<{ dist: number; cx: number; cy: number }>({ dist: 0, cx: 0, cy: 0 });

  const isCurrentlyZoomed = isZooming || zoomState.scale > 1 || transitioningBack;

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "diagram") {
      setImageLoaded(false);
      setZoomState({ scale: 1, x: 0, y: 0 });
      setIsZooming(false);
      setTransitioningBack(false);
      isZoomingRef.current = false;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!zoomContainer) {
      setZoomState({ scale: 1, x: 0, y: 0 });
      setIsZooming(false);
      setTransitioningBack(false);
      isZoomingRef.current = false;
      return;
    }

    // Explicitly reset everything on mount/remount of the zoom container to guarantee a fresh state
    setZoomState({ scale: 1, x: 0, y: 0 });
    setIsZooming(false);
    setTransitioningBack(false);
    isZoomingRef.current = false;

    const onTouchStart = (e: TouchEvent) => {
      const metrics = getPinchTouchMetrics(e.touches);
      if (!metrics) {
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      touchStartRef.current = metrics;
      isZoomingRef.current = true;
      setIsZooming(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isZoomingRef.current) {
        return;
      }

      const metrics = getPinchTouchMetrics(e.touches);
      if (!metrics) {
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      const scale = Math.min(4.5, Math.max(1, metrics.dist / touchStartRef.current.dist));
      const x = metrics.cx - touchStartRef.current.cx;
      const y = metrics.cy - touchStartRef.current.cy;

      setZoomState({ scale, x, y });
    };

    const onTouchEnd = () => {
      if (isZoomingRef.current) {
        isZoomingRef.current = false;
        setIsZooming(false);
        setZoomState({ scale: 1, x: 0, y: 0 });
        setTransitioningBack(true);
        setTimeout(() => {
          setTransitioningBack(false);
        }, 300);
      }
    };

    zoomContainer.addEventListener("touchstart", onTouchStart, { passive: false });
    zoomContainer.addEventListener("touchmove", onTouchMove, { passive: false });
    zoomContainer.addEventListener("touchend", onTouchEnd, { passive: true });
    zoomContainer.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      zoomContainer.removeEventListener("touchstart", onTouchStart);
      zoomContainer.removeEventListener("touchmove", onTouchMove);
      zoomContainer.removeEventListener("touchend", onTouchEnd);
      zoomContainer.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [zoomContainer]);

  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const dashboardTitle = "Edge Bytes Served by Country";

  const activeRef = useRef(true);
  const hasDataRef = useRef(false);
  const lastFetchedAtRef = useRef(0);

  const fetchRuntimeSnapshot = useCallback(async (force = false) => {
    if (!force && !isStale(lastFetchedAtRef.current, Date.now())) {
      return;
    }
    lastFetchedAtRef.current = Date.now();

    try {
      const response = await fetch("/data/data.json");
      if (!activeRef.current) return;

      if (response.ok) {
        const data = await response.json();
        if (!activeRef.current) return;
        setSnapshotData(data);
        hasDataRef.current = true;
        setIsUnavailable(false);
      } else if (!hasDataRef.current) {
        // Only surface the error card if we have nothing to show. A failed refresh over
        // an already-rendered chart should leave that chart alone.
        setIsUnavailable(true);
      }
    } catch (err) {
      console.warn("Could not fetch runtime /data/data.json:", err);
      if (activeRef.current && !hasDataRef.current) {
        setIsUnavailable(true);
      }
    } finally {
      if (activeRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    fetchRuntimeSnapshot(true);
    return () => {
      activeRef.current = false;
    };
  }, [fetchRuntimeSnapshot]);

  // The payload is cheap to serve from the edge, so refresh it — but only while someone
  // is actually looking at the chart.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const sync = () => {
      if (!shouldPoll(activeTab, document.visibilityState)) {
        stop();
        return;
      }
      // Throttled, so flipping tabs repeatedly cannot storm the origin.
      fetchRuntimeSnapshot();
      if (timer === undefined) {
        timer = setInterval(() => fetchRuntimeSnapshot(true), POLL_INTERVAL_MS);
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [activeTab, fetchRuntimeSnapshot]);

  // Parse the matrix payload into coordinate records. The Worker deliberately emits
  // the same query_range shape the old cron produced, so this parser is unchanged.
  const parsePanelMetrics = (panel: any): any[] => {
    if (!panel || !panel.rawData) return [];

    try {
      const result = panel.rawData.result || [];
      const mergedByTime: Record<number, any> = {};

      result.forEach((series: any) => {
        const metricObj = series.metric || {};
        
        // Dynamically resolve legend/series label name from available keys
        const getSeriesLabel = (metric: Record<string, string>): string => {
          if (!metric) return "Value";
          const preferredLabels = ["country", "pod", "namespace", "container", "instance", "job", "device", "host", "service"];
          for (const label of preferredLabels) {
            if (metric[label]) return metric[label];
          }
          if (metric.__name__) return metric.__name__;
          const remainingKeys = Object.keys(metric).filter(k => k !== "__name__");
          return remainingKeys.length > 0 ? remainingKeys.map(k => metric[k]).join("-") : "Value";
        };

        const seriesName = getSeriesLabel(metricObj);
        const values = series.values || [];
        
        values.forEach((valPair: any) => {
          if (!Array.isArray(valPair) || valPair.length < 2) return;
          const rawTime = valPair[0];
          const valStr = valPair[1];
          
          const timestampMillis = Number(rawTime) * 1000;
          if (isNaN(timestampMillis)) return;

          const val = parseFloat(valStr);
          if (isNaN(val)) return;

          // Convert raw byte values to MiB
          const valInMiB = val / (1024 * 1024);

          if (!mergedByTime[timestampMillis]) {
            const date = new Date(timestampMillis);
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const hrs = date.getHours().toString().padStart(2, "0");
            // Buckets are hourly across a seven-day window, so the label has to carry the
            // date: a bare HH:MM would repeat seven times over and read as a single day.
            mergedByTime[timestampMillis] = {
              timestampMillis,
              timestamp: `${day}/${month} ${hrs}:00`,
            };
          }
          mergedByTime[timestampMillis][seriesName] = Math.round(valInMiB * 100) / 100;
        });
      });

      const sortedTimes = Object.keys(mergedByTime).map(Number).sort((a, b) => a - b);
      return sortedTimes.map(t => mergedByTime[t]);
    } catch (err) {
      console.warn("Could not parse analytics matrix:", err);
    }
    return [];
  };

  // Get distinct series/metrics keys to plot
  const getMetricsKeys = (data: any[]) => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== "timestamp" && key !== "timestampMillis") {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  };

  // Build the single adaptive timeline panel purely around the analytics response payload
  const panels = !isUnavailable && snapshotData ? [{
    id: "cloudflare-analytics-matrix",
    title: dashboardTitle,
    type: "timeseries",
    unit: "LAST 7 DAYS",
    rawData: snapshotData?.data,
  }] : [];

  return (
    <section className="pt-20 pb-20 px-6 relative overflow-hidden bg-white" id="architecture">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          className="mb-12 text-left"
          eyebrow="System Flow"
          title="How Am I"
          titleMuted="Running This?"
          titleClassName="text-5xl md:text-6xl font-black mb-4 text-slate-900 tracking-tighter"
          description="I'm running this on Cloudflare Workers — static assets served straight from the edge, with a cron-triggered Worker turning Cloudflare's own analytics into the live chart below. Here's the system design!"
        />

        {/* Dynamic Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 bg-slate-100 rounded-3xl border border-slate-200/60 shadow-sm">
            <button
              onClick={() => setActiveTab("diagram")}
              className={`sys-toggle-btn flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-100 ${
                activeTab === "diagram"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 transition-colors duration-100 ${activeTab === "diagram" ? "text-brand-primary" : "text-slate-400"}`} />
              System Design
            </button>
            <button
              onClick={() => setActiveTab("metrics")}
              className={`sys-toggle-btn flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-100 ${
                activeTab === "metrics"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Activity className={`w-4 h-4 transition-colors duration-100 ${activeTab === "metrics" ? "text-brand-primary" : "text-slate-400"}`} />
              Metrics
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "diagram" ? (
            <TabPanel
              panelKey="diagram-tab"
              className="relative flex flex-col items-center w-full max-w-4xl lg:max-w-2xl mx-auto"
            >
              <div 
                ref={setZoomContainer} 
                className={`architecture-diagram-container relative w-full rounded-2xl border-2 border-slate-900 bg-white select-none aspect-[816/844] touch-pan-y transition-shadow duration-300 ${
                  isCurrentlyZoomed 
                    ? "overflow-visible z-[100] shadow-[0_30px_70px_rgba(0,0,0,0.25)]" 
                    : "overflow-hidden z-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                }`}
              >
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-3 z-20">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-cyan-500 animate-spin" />
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold animate-pulse">Rendering system design...</span>
                  </div>
                )}
                <div 
                  className="w-full h-auto origin-center"
                  style={{
                    transform: `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale3d(${zoomState.scale}, ${zoomState.scale}, 1)`,
                    transition: isZooming ? "none" : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
                    willChange: "transform"
                  }}
                >
                  <img 
                    ref={imgRef}
                    src={DIAGRAM_URL} 
                    onLoad={() => setImageLoaded(true)}
                    alt="Cloud Architecture Strategy" 
                    className="w-full h-auto block mx-auto select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </TabPanel>
          ) : (
                  <TabPanel
                    panelKey="metrics-tab"
                    className="w-full max-w-4xl mx-auto flex flex-col gap-6"
                  >
              <div className="relative w-full rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden shadow-[0_20px_50px_rgba(30,41,59,0.15)] flex flex-col">
                {/* Main Dashboard Workspace area */}
                <div className="p-6 bg-slate-950 flex flex-col gap-6 min-h-[500px]">

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500 font-mono text-xs">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin" />
                      <span>Querying Cloudflare Analytics...</span>
                    </div>
                  ) : isUnavailable ? (
                    <div className="flex flex-col items-center justify-center p-8 py-20 border border-slate-900 rounded-2xl text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 animate-pulse mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wider mb-2">
                        Technical Difficulties
                      </h3>
                      <p className="text-slate-400 text-xs font-sans max-w-sm leading-relaxed mx-auto">
                        Data will be back up shortly.
                      </p>
                    </div>
                  ) : (
                    /* Dynamic metrics Panels Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {panels.length > 0 ? (
                        panels.map((panel, idx) => {
                          const metricsData = parsePanelMetrics(panel);
                          const keys = getMetricsKeys(metricsData);
                          const title = panel.title || "Metrics Panel";
                          const unit = panel.unit || "";

                          // Default Timeseries Area Chart
                          return (
                            <div key={panel.id || idx} className="p-5 rounded-2xl border border-slate-900 bg-slate-900/30 flex flex-col gap-3 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-brand-primary" />
                                  {title}
                                </h3>
                                {unit && (
                                  <span className="text-[9px] font-mono text-brand-primary px-1.5 py-0.5 rounded-sm bg-blue-950/40 border border-blue-900/40">
                                    {unit}
                                  </span>
                                )}
                              </div>

                              <div className="h-80 sm:h-96 md:h-[400px] w-full mt-2">
                                {metricsData.length > 0 && keys.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metricsData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                      <defs>
                                        {keys.map((key, index) => {
                                          const strokeColor = metricsStrokeColor(index);
                                          const gradId = metricsGradientId(panel.id, key);
                                          return (
                                            <linearGradient id={gradId} key={gradId} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25}/>
                                              <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                                            </linearGradient>
                                          );
                                        })}
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                                      <XAxis dataKey="timestamp" stroke="#64748b" fontSize={9} minTickGap={30} />
                                      <YAxis stroke="#64748b" fontSize={9} domain={[0, 'auto']} />
                                      <Tooltip 
                                        position={{ y: 0 }}
                                        wrapperStyle={{ pointerEvents: 'none', zIndex: 50 }}
                                        contentStyle={{ 
                                          backgroundColor: 'rgba(15, 23, 42, 0.75)', 
                                          borderColor: 'rgba(30, 41, 59, 0.8)', 
                                          borderRadius: '12px', 
                                          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                                          backdropFilter: 'blur(6px)',
                                          WebkitBackdropFilter: 'blur(6px)'
                                        }} 
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                        formatter={(value: any, name: any) => [`${value} MiB`, name]}
                                      />
                                      <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                                      {keys.map((key, index) => {
                                        const strokeColor = metricsStrokeColor(index);
                                        const gradId = metricsGradientId(panel.id, key);

                                        if (isMetricsLimitKey(key)) {
                                          return (
                                            <Area 
                                              key={key}
                                              type="monotone" 
                                              name={key} 
                                              dataKey={key} 
                                              stroke="#ef4444" 
                                              strokeWidth={1.5} 
                                              strokeDasharray="4 4" 
                                              fill="none" 
                                            />
                                          );
                                        }

                                        return (
                                          <Area 
                                            key={key}
                                            type="monotone" 
                                            name={key} 
                                            dataKey={key} 
                                            stroke={strokeColor} 
                                            strokeWidth={2} 
                                            fillOpacity={1} 
                                            fill={`url(#${gradId})`} 
                                          />
                                        );
                                      })}
                                    </AreaChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 font-mono">
                                    No parsed metrics data for this panel
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl col-span-2 text-slate-500 text-sm font-mono flex flex-col items-center justify-center gap-2">
                           <Info className="w-5 h-5 text-slate-600" />
                           <span>No active metrics panels detected in the analytics response</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion view looking into the actual analytics payload */}
                  <div className="mt-2 border-t border-slate-900 pt-4 flex flex-col">
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-left py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer self-start select-none transition-colors"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {showRawJson ? "[- Hide Cloudflare Analytics response payload]" : "[+ View Cloudflare Analytics response payload]"}
                    </button>

                    <AnimatePresence>
                      {showRawJson && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-3"
                        >
                          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-[250px] leading-relaxed select-all">
                            {JSON.stringify(snapshotData, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>


            </TabPanel>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};


