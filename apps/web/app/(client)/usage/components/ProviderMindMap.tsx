"use client";

import { useEffect, useRef, useState } from "react";

interface Provider {
  id: string;
  name: string;
  color: string;
  textIcon?: string;
  hasKey: boolean;
}

interface ProviderMindMapProps {
  providers: Provider[];
  isLoading?: boolean;
}

function getProviderIcon(provider: Provider, cx: number, cy: number): React.ReactNode {
  if (provider.textIcon) {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="-0.5"
      >
        {provider.textIcon}
      </text>
    );
  }
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      fontSize="10"
      fontWeight="700"
      fontFamily="Inter, system-ui, sans-serif"
    >
      {provider.name.slice(0, 2).toUpperCase()}
    </text>
  );
}

// Curved bezier path from center node to provider node with mild bending
function getCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.35;
  const cy1 = y1 + dy * 0.1;
  const cx2 = x1 + dx * 0.65;
  const cy2 = y2 - dy * 0.1;
  return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
}export default function ProviderMindMap({
  providers,
  isLoading,
}: ProviderMindMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 400, height: 360 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth || 400,
          height: containerRef.current.clientHeight || 360,
        });
      }
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  // Animate nodes in staggered
  useEffect(() => {
    if (providers.length === 0) return;
    providers.forEach((p, i) => {
      setTimeout(() => {
        setAnimatedIds((prev) => new Set([...prev, p.id]));
      }, 60 * i);
    });
  }, [providers]);

  const cx = size.width / 2;
  const cy = size.height / 2;
  
  // Dynamic radius based on layout size to avoid clipping
  const radius = Math.min(size.width, size.height) * 0.34;

  const nodeRadius = 24;
  const centerRadius = 38;

  // Zoom In / Out / Reset functions
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z * 1.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z / 1.2));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Dragging / Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Simple zoom on wheel scroll
    const factor = 1.05;
    const newZoom = e.deltaY < 0 ? zoom * factor : zoom / factor;
    setZoom(Math.max(0.4, Math.min(2.5, newZoom)));
  };

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-surface-hover/5 rounded-2xl"
      >
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <span className="material-symbols-outlined animate-spin text-[32px] text-primary">
            progress_activity
          </span>
          <span className="text-sm font-medium">Loading connections...</span>
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center gap-3 text-text-muted p-6"
      >
        <span className="material-symbols-outlined text-5xl opacity-10">
          hub
        </span>
        <p className="text-sm font-medium italic">
          No providers connected yet
        </p>
        <p className="text-xs text-center opacity-70 max-w-xs">
          Add API keys in Settings to see your provider connections here
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none overflow-hidden"
    >
      {/* Zoom UI Controller */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5 bg-card/85 backdrop-blur border border-border/60 p-1.5 rounded-xl shadow-md">
        <button
          onClick={handleZoomIn}
          className="size-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-colors active:scale-95"
          title="Zoom In"
        >
          <span className="material-symbols-outlined text-[18px] font-bold">add</span>
        </button>
        <button
          onClick={handleZoomOut}
          className="size-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-colors active:scale-95"
          title="Zoom Out"
        >
          <span className="material-symbols-outlined text-[18px] font-bold">remove</span>
        </button>
        <div className="h-px bg-border/50 my-0.5 mx-1" />
        <button
          onClick={handleReset}
          className="size-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-colors active:scale-95"
          title="Reset Zoom"
        >
          <span className="material-symbols-outlined text-[16px] font-bold">fullscreen_exit</span>
        </button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className={`w-full h-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Radial glow for center */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.25)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </radialGradient>

          {/* Provider gradients */}
          {providers.map((p) => (
            <radialGradient
              key={`grad-${p.id}`}
              id={`grad-${p.id}`}
              cx="30%"
              cy="30%"
              r="70%"
            >
              <stop offset="0%" stopColor={p.color} stopOpacity="1" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0.75" />
            </radialGradient>
          ))}

          {/* Glow filter for connections */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow for nodes */}
          <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.2" />
          </filter>

          {/* Custom line gradients from center to nodes */}
          {providers.map((p, i) => {
            const angle = (2 * Math.PI * i) / providers.length - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            return (
              <linearGradient
                key={`line-grad-${p.id}`}
                id={`line-grad-${p.id}`}
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="rgba(139,92,246,0.85)" />
                <stop offset="60%" stopColor={p.color} stopOpacity="0.7" />
                <stop offset="100%" stopColor={p.color} stopOpacity="0.9" />
              </linearGradient>
            );
          })}
        </defs>

        {/* Background grid dots */}
        <pattern
          id="dots"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="0.75" fill="currentColor" opacity="0.05" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#dots)" />

        {/* Zoom and Pan container */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: `${cx}px ${cy}px`, transition: isDragging ? "none" : "transform 0.15s ease-out" }}>
          {/* Ambient glow behind center */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius * 2.8}
            fill="url(#centerGlow)"
          />

          {/* Connection lines */}
          {providers.map((provider, i) => {
            const angle = (2 * Math.PI * i) / providers.length - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            const isHovered = hoveredId === provider.id;
            const isAnimated = animatedIds.has(provider.id);

            // Calculate precise edge intersections
            const lineStartX = cx + (centerRadius + 3) * Math.cos(angle);
            const lineStartY = cy + (centerRadius + 3) * Math.sin(angle);
            const lineEndX = nx - (nodeRadius + 2) * Math.cos(angle);
            const lineEndY = ny - (nodeRadius + 2) * Math.sin(angle);

            return (
              <g key={`line-${provider.id}`}>
                {/* Glow line (behind) */}
                <path
                  d={getCurvedPath(lineStartX, lineStartY, lineEndX, lineEndY)}
                  fill="none"
                  stroke={`url(#line-grad-${provider.id})`}
                  strokeWidth={isHovered ? 4.5 : 2}
                  strokeOpacity={isAnimated ? (isHovered ? 0.75 : 0.4) : 0}
                  strokeDasharray={isHovered ? "none" : "4 3"}
                  filter="url(#lineGlow)"
                  style={{
                    transition: "stroke-opacity 0.4s ease, stroke-width 0.2s ease",
                    transitionDelay: isAnimated ? "0ms" : `${60 * i}ms`,
                  }}
                />
                {/* Main line */}
                <path
                  d={getCurvedPath(lineStartX, lineStartY, lineEndX, lineEndY)}
                  fill="none"
                  stroke={`url(#line-grad-${provider.id})`}
                  strokeWidth={isHovered ? 2.5 : 1.2}
                  strokeOpacity={isAnimated ? (isHovered ? 0.95 : 0.6) : 0}
                  strokeDasharray={isHovered ? "none" : "4 3"}
                  style={{
                    transition: "stroke-opacity 0.4s ease, stroke-width 0.2s ease",
                    transitionDelay: isAnimated ? "0ms" : `${60 * i}ms`,
                  }}
                />
              </g>
            );
          })}

          {/* Provider nodes */}
          {providers.map((provider, i) => {
            const angle = (2 * Math.PI * i) / providers.length - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            const isHovered = hoveredId === provider.id;
            const isAnimated = animatedIds.has(provider.id);

            // Push labels radially outward
            const labelOffsetX = Math.cos(angle) * (nodeRadius + 14);
            const labelOffsetY = Math.sin(angle) * (nodeRadius + 14);
            const labelAnchor =
              Math.cos(angle) > 0.35
                ? "start"
                : Math.cos(angle) < -0.35
                ? "end"
                : "middle";

            return (
              <g
                key={`node-${provider.id}`}
                style={{
                  cursor: "pointer",
                  opacity: isAnimated ? 1 : 0,
                  transform: isAnimated ? "scale(1)" : `scale(0.5)`,
                  transformOrigin: `${nx}px ${ny}px`,
                  transition: `opacity 0.4s ease ${60 * i}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${60 * i}ms`,
                }}
                onMouseEnter={() => setHoveredId(provider.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Hover pulsing halo ring */}
                {isHovered && (
                  <circle
                    cx={nx}
                    cy={ny}
                    r={nodeRadius + 7}
                    fill="none"
                    stroke={provider.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Node shadow circle */}
                <circle
                  cx={nx}
                  cy={ny}
                  r={isHovered ? nodeRadius + 2 : nodeRadius}
                  fill={provider.color}
                  opacity="0.12"
                  filter="url(#nodeShadow)"
                  style={{ transition: "r 0.2s ease" }}
                />

                {/* Main node circle */}
                <circle
                  cx={nx}
                  cy={ny}
                  r={isHovered ? nodeRadius + 1 : nodeRadius}
                  fill={`url(#grad-${provider.id})`}
                  stroke={provider.color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeOpacity={isHovered ? 1 : 0.55}
                  filter="url(#nodeShadow)"
                  style={{ transition: "r 0.2s ease, stroke-width 0.2s ease" }}
                />

                {/* Icon / Image with failback */}
                <g
                  style={{
                    transform: `scale(${isHovered ? 1.15 : 1})`,
                    transition: "transform 0.2s ease",
                    transformOrigin: `${nx}px ${ny}px`,
                  }}
                >
                  {failedImages[provider.id] ? (
                    getProviderIcon(provider, nx, ny)
                  ) : (
                    <>
                      <defs>
                        <clipPath id={`clip-${provider.id}`}>
                          <circle cx={nx} cy={ny} r={13} />
                        </clipPath>
                      </defs>
                      <image
                        href={`/providers/${provider.id}.png`}
                        x={nx - 13}
                        y={ny - 13}
                        width={26}
                        height={26}
                        clipPath={`url(#clip-${provider.id})`}
                        onError={() => {
                          setFailedImages((prev) => ({ ...prev, [provider.id]: true }));
                        }}
                      />
                    </>
                  )}
                </g>

                {/* Node label */}
                <text
                  x={nx + labelOffsetX}
                  y={ny + labelOffsetY}
                  textAnchor={labelAnchor}
                  dominantBaseline="central"
                  fill={isHovered ? provider.color : "currentColor"}
                  fontSize="10"
                  fontWeight={isHovered ? "700" : "600"}
                  fontFamily="Inter, system-ui, sans-serif"
                  opacity={isHovered ? 1 : 0.75}
                  style={{ transition: "all 0.2s ease", pointerEvents: "none" }}
                >
                  {provider.name.length > 10
                    ? provider.name.slice(0, 10) + "…"
                    : provider.name}
                </text>
              </g>
            );
          })}

          {/* Central Tinobot node */}
          <g>
            {/* Ambient pulsing ring */}
            <circle
              cx={cx}
              cy={cy}
              r={centerRadius + 12}
              fill="none"
              stroke="rgba(139,92,246,0.18)"
              strokeWidth="1"
            >
              <animate
                attributeName="r"
                values={`${centerRadius + 8};${centerRadius + 18};${centerRadius + 8}`}
                dur="3.2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.22;0.06;0.22"
                dur="3.2s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Inner background */}
            <circle
              cx={cx}
              cy={cy}
              r={centerRadius + 3}
              fill="rgba(139,92,246,0.08)"
            />

            {/* Center border circle */}
            <circle
              cx={cx}
              cy={cy}
              r={centerRadius}
              fill="#18182b"
              stroke="rgba(139,92,246,0.8)"
              strokeWidth="2.2"
              filter="url(#nodeShadow)"
            />

            {/* Tinobot Title */}
            <text
              x={cx}
              y={cy - 5}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(139,92,246,1)"
              fontSize="12.5"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
              letterSpacing="-0.5"
            >
              Tinobot
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(139,92,246,0.5)"
              fontSize="7.5"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              letterSpacing="0.8"
            >
              AI GATEWAY
            </text>
          </g>

          {/* Tooltip on Node Hover */}
          {hoveredId && (() => {
            const prov = providers.find((p) => p.id === hoveredId);
            if (!prov) return null;
            const idx = providers.indexOf(prov);
            const angle = (2 * Math.PI * idx) / providers.length - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            const pillY = ny - nodeRadius - 16;
            return (
              <g>
                <rect
                  x={nx - 36}
                  y={pillY - 9}
                  width={72}
                  height={18}
                  rx="9"
                  fill={prov.color}
                  opacity="0.9"
                />
                <text
                  x={nx}
                  y={pillY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif"
                  letterSpacing="0.5"
                >
                  {prov.id.toUpperCase()}
                </text>
              </g>
            );
          })()}
        </g>
      </svg>
    </div>
  );
}
