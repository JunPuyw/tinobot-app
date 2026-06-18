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
        fill="#0f172a"
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
      fill="#0f172a"
      fontSize="10"
      fontWeight="700"
      fontFamily="Inter, system-ui, sans-serif"
    >
      {provider.name.slice(0, 2).toUpperCase()}
    </text>
  );
}

// Cubic bezier path for vertical connection
function getCurvedPathVertical(x1: number, y1: number, x2: number, y2: number): string {
  const dy = y2 - y1;
  const cy1 = y1 + dy * 0.45;
  const cy2 = y2 - dy * 0.45;
  return `M ${x1} ${y1} C ${x1} ${cy1} ${x2} ${cy2} ${x2} ${y2}`;
}

// Cubic bezier path for horizontal connection
function getCurvedPathHorizontal(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const cx1 = x1 + dx * 0.45;
  const cx2 = x2 - dx * 0.45;
  return `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`;
}

// Connect from border edge of Tinobot box to border edge of provider box
function getConnectionPath(
  cx: number, cy: number, cw: number, ch: number,
  nx: number, ny: number, nw: number, nh: number,
  angle: number
): string {
  let normAngle = angle;
  while (normAngle > Math.PI) normAngle -= 2 * Math.PI;
  while (normAngle < -Math.PI) normAngle += 2 * Math.PI;

  const deg = (normAngle * 180) / Math.PI;

  // Upper region
  if (deg >= -135 && deg < -45) {
    return getCurvedPathVertical(cx, cy - ch / 2, nx, ny + nh / 2);
  }
  // Lower region
  else if (deg >= 45 && deg < 135) {
    return getCurvedPathVertical(cx, cy + ch / 2, nx, ny - nh / 2);
  }
  // Right region
  else if (deg >= -45 && deg < 45) {
    return getCurvedPathHorizontal(cx + cw / 2, cy, nx - nw / 2, ny);
  }
  // Left region
  else {
    return getCurvedPathHorizontal(cx - cw / 2, cy, nx + nw / 2, ny);
  }
}

export default function ProviderMindMap({
  providers,
  isLoading,
}: ProviderMindMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 700, height: 420 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Pan and Zoom States
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: Math.max(380, Math.min(520, entry.contentRect.width * 0.55)),
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Staggered node animation
  useEffect(() => {
    if (providers.length === 0) return;
    providers.forEach((p, i) => {
      setTimeout(() => {
        setAnimatedIds((prev) => new Set([...prev, p.id]));
      }, 80 * i);
    });
  }, [providers]);

  // Handle Drag Gestures
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    let newScale = scale;
    if (e.deltaY < 0) {
      newScale = Math.min(scale * zoomFactor, 3.0);
    } else {
      newScale = Math.max(scale / zoomFactor, 0.5);
    }
    setScale(newScale);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev * 1.15, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev / 1.15, 0.5));
  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const cx = size.width / 2;
  const cy = size.height / 2;
  const radius = Math.min(cx, cy) * 0.68;

  // Node Dimensions
  const nodeWidth = 168;
  const nodeHeight = 44;
  const centerWidth = 130;
  const centerHeight = 38;

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center"
        style={{ height: size.height }}
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
        className="w-full flex flex-col items-center justify-center gap-3 text-text-muted"
        style={{ height: size.height }}
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
      className="w-full relative select-none overflow-hidden"
      style={{ height: size.height }}
    >
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        style={{ overflow: "visible", cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* Radial glow for center */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(232,112,64,0.2)" />
            <stop offset="100%" stopColor="rgba(232,112,64,0)" />
          </radialGradient>

          {/* Glow filter for connections */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow for nodes */}
          <filter id="nodeShadow" x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Background grid dots */}
        <pattern
          id="dots"
          x={translate.x}
          y={translate.y}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.06" />
        </pattern>
        <rect width={size.width} height={size.height} fill="url(#dots)" />

        {/* Transform Group (Zoom & Pan) */}
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
          {/* Ambient glow behind center */}
          <circle
            cx={cx}
            cy={cy}
            r={160}
            fill="url(#centerGlow)"
          />

          {/* Connection lines */}
          {providers.map((provider, i) => {
            const angle = (2 * Math.PI * i) / providers.length - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            const isHovered = hoveredId === provider.id;
            const isAnimated = animatedIds.has(provider.id);

            const path = getConnectionPath(
              cx, cy, centerWidth, centerHeight,
              nx, ny, nodeWidth, nodeHeight,
              angle
            );

            return (
              <g key={`line-${provider.id}`}>
                {/* Glow line (behind) */}
                <path
                  d={path}
                  fill="none"
                  stroke={provider.color}
                  strokeWidth={isHovered ? 2.5 : 1.2}
                  strokeOpacity={isAnimated ? (isHovered ? 0.5 : 0.2) : 0}
                  filter="url(#lineGlow)"
                  style={{
                    transition: "stroke-opacity 0.4s ease, stroke-width 0.2s ease",
                    transitionDelay: isAnimated ? "0ms" : `${80 * i}ms`,
                  }}
                />
                {/* Main line */}
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth={isHovered ? 1.5 : 1}
                  strokeOpacity={isAnimated ? (isHovered ? 0.85 : 0.5) : 0}
                  style={{
                    transition: "stroke-opacity 0.4s ease, stroke-width 0.2s ease",
                    transitionDelay: isAnimated ? "0ms" : `${80 * i}ms`,
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

            return (
              <g
                key={`node-${provider.id}`}
                style={{
                  cursor: "pointer",
                  opacity: isAnimated ? 1 : 0,
                  transform: isAnimated ? "scale(1)" : `scale(0.5)`,
                  transformOrigin: `${nx}px ${ny}px`,
                  transition: `opacity 0.4s ease ${80 * i}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${80 * i}ms`,
                }}
                onMouseEnter={() => setHoveredId(provider.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <rect
                    x={nx - nodeWidth / 2 - 4}
                    y={ny - nodeHeight / 2 - 4}
                    width={nodeWidth + 8}
                    height={nodeHeight + 8}
                    rx={12}
                    ry={12}
                    fill="none"
                    stroke={provider.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Node card shape (White background, black text) */}
                <rect
                  x={nx - nodeWidth / 2}
                  y={ny - nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={10}
                  ry={10}
                  fill="#ffffff"
                  stroke={isHovered ? provider.color : "transparent"}
                  strokeWidth={1.5}
                  filter="url(#nodeShadow)"
                  style={{
                    transition: "stroke 0.2s ease",
                  }}
                />

                {/* Logo Image / Fallback Text */}
                <g>
                  {failedImages[provider.id] ? (
                    <>
                      <circle
                        cx={nx - nodeWidth / 2 + 22}
                        cy={ny}
                        r={13}
                        fill={`${provider.color}15`}
                        stroke={`${provider.color}30`}
                        strokeWidth={1}
                      />
                      {getProviderIcon(provider, nx - nodeWidth / 2 + 22, ny)}
                    </>
                  ) : (
                    <>
                      <defs>
                        <clipPath id={`clip-${provider.id}`}>
                          <circle cx={nx - nodeWidth / 2 + 22} cy={ny} r={13} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={nx - nodeWidth / 2 + 22}
                        cy={ny}
                        r={13}
                        fill="#f1f5f9"
                      />
                      <image
                        href={`/providers/${provider.id}.png`}
                        x={nx - nodeWidth / 2 + 9}
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

                {/* Provider name label */}
                <text
                  x={nx - nodeWidth / 2 + 44}
                  y={ny}
                  textAnchor="start"
                  dominantBaseline="central"
                  fill="#0f172a"
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {provider.name}
                </text>
              </g>
            );
          })}

          {/* Center Tinobot node */}
          <g>
            {/* Pulsing ring animation */}
            <rect
              x={cx - centerWidth / 2 - 10}
              y={cy - centerHeight / 2 - 10}
              width={centerWidth + 20}
              height={centerHeight + 20}
              rx={16}
              ry={16}
              fill="none"
              stroke="rgba(232,112,64,0.15)"
              strokeWidth="1.5"
            >
              <animate
                attributeName="stroke-opacity"
                values="0.25;0.05;0.25"
                dur="3s"
                repeatCount="indefinite"
              />
            </rect>

            {/* Center card shape (Dark background, orange border) */}
            <rect
              x={cx - centerWidth / 2}
              y={cy - centerHeight / 2}
              width={centerWidth}
              height={centerHeight}
              rx={10}
              ry={10}
              fill="#0d0d15"
              stroke="#e87040"
              strokeWidth="1.8"
              filter="url(#nodeShadow)"
            />

            {/* Tinobot Text */}
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#e87040"
              fontSize="12.5"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
              letterSpacing="0.2"
            >
              Tinobot
            </text>
          </g>
        </g>
      </svg>

      {/* Floating Zoom & Pan Controls in Bottom-Left */}
      <div className="absolute left-4 bottom-4 flex flex-col bg-card/90 border border-border/80 rounded-lg shadow-lg overflow-hidden z-20 backdrop-blur-md">
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center text-text-main hover:bg-surface border-b border-border/50 transition-colors font-bold text-lg"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center text-text-main hover:bg-surface border-b border-border/50 transition-colors font-bold text-lg"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="w-8 h-8 flex items-center justify-center text-text-main hover:bg-surface transition-colors"
          title="Reset Zoom"
        >
          <span className="material-symbols-outlined text-[16px]">crop_free</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute right-4 bottom-4 flex flex-wrap justify-end gap-3 px-2 z-10 pointer-events-none">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 opacity-80"
          >
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/10"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[10px] font-bold text-text-muted">
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
