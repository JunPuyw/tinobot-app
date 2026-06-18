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

// Cubic bezier path from center node to provider node
function getCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.4;
  const cy1 = y1 + dy * 0.1;
  const cx2 = x1 + dx * 0.6;
  const cy2 = y2 - dy * 0.1;
  return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
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

  // Animate nodes in staggered
  useEffect(() => {
    if (providers.length === 0) return;
    providers.forEach((p, i) => {
      setTimeout(() => {
        setAnimatedIds((prev) => new Set([...prev, p.id]));
      }, 80 * i);
    });
  }, [providers]);

  const cx = size.width / 2;
  const cy = size.height / 2;
  const radius = Math.min(cx, cy) * 0.68;

  const nodeRadius = 26;
  const centerRadius = 42;

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
    <div ref={containerRef} className="w-full select-none" style={{ height: size.height }}>
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Radial glow for center */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.3)" />
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
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow for nodes */}
          <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
          </filter>

          {/* Pulsing animation ring */}
          <filter id="pulse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid dots */}
        <pattern
          id="dots"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.06" />
        </pattern>
        <rect width={size.width} height={size.height} fill="url(#dots)" />

        {/* Ambient glow behind center */}
        <circle
          cx={cx}
          cy={cy}
          r={centerRadius * 2.5}
          fill="url(#centerGlow)"
        />

        {/* Connection lines */}
        {providers.map((provider, i) => {
          const angle = (2 * Math.PI * i) / providers.length - Math.PI / 2;
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          const isHovered = hoveredId === provider.id;
          const isAnimated = animatedIds.has(provider.id);

          // Shorten line endpoints to avoid overlapping nodes
          const lineStartX = cx + (centerRadius + 4) * Math.cos(angle);
          const lineStartY = cy + (centerRadius + 4) * Math.sin(angle);
          const lineEndX = nx - (nodeRadius + 2) * Math.cos(angle);
          const lineEndY = ny - (nodeRadius + 2) * Math.sin(angle);

          return (
            <g key={`line-${provider.id}`}>
              {/* Glow line (behind) */}
              <path
                d={getCurvedPath(lineStartX, lineStartY, lineEndX, lineEndY)}
                fill="none"
                stroke={provider.color}
                strokeWidth={isHovered ? 3 : 1.5}
                strokeOpacity={isAnimated ? (isHovered ? 0.6 : 0.25) : 0}
                strokeDasharray={isHovered ? "none" : "4 3"}
                filter="url(#lineGlow)"
                style={{
                  transition: "stroke-opacity 0.4s ease, stroke-width 0.2s ease",
                  transitionDelay: isAnimated ? "0ms" : `${80 * i}ms`,
                }}
              />
              {/* Main line */}
              <path
                d={getCurvedPath(lineStartX, lineStartY, lineEndX, lineEndY)}
                fill="none"
                stroke={provider.color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={isAnimated ? (isHovered ? 0.9 : 0.45) : 0}
                strokeDasharray={isHovered ? "none" : "4 3"}
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

          // Label position — push outward from node
          const labelOffsetX = Math.cos(angle) * (nodeRadius + 18);
          const labelOffsetY = Math.sin(angle) * (nodeRadius + 18);
          const labelAnchor =
            Math.cos(angle) > 0.3
              ? "start"
              : Math.cos(angle) < -0.3
              ? "end"
              : "middle";

          return (
            <g
              key={`node-${provider.id}`}
              style={{
                cursor: "pointer",
                opacity: isAnimated ? 1 : 0,
                transform: isAnimated
                  ? "scale(1)"
                  : `scale(0.5)`,
                transformOrigin: `${nx}px ${ny}px`,
                transition: `opacity 0.4s ease ${80 * i}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${80 * i}ms`,
              }}
              onMouseEnter={() => setHoveredId(provider.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Hover ring */}
              {isHovered && (
                <circle
                  cx={nx}
                  cy={ny}
                  r={nodeRadius + 8}
                  fill="none"
                  stroke={provider.color}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
              )}

              {/* Node circle shadow */}
              <circle
                cx={nx}
                cy={ny}
                r={isHovered ? nodeRadius + 3 : nodeRadius}
                fill={provider.color}
                opacity="0.15"
                filter="url(#nodeShadow)"
                style={{ transition: "r 0.2s ease" }}
              />

              {/* Node circle */}
              <circle
                cx={nx}
                cy={ny}
                r={isHovered ? nodeRadius + 2 : nodeRadius}
                fill={`url(#grad-${provider.id})`}
                stroke={provider.color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeOpacity={isHovered ? 1 : 0.5}
                filter="url(#nodeShadow)"
                style={{ transition: "r 0.2s ease, stroke-width 0.2s ease" }}
              />

              {/* Icon / Text inside node */}
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
                        <circle cx={nx} cy={ny} r={14} />
                      </clipPath>
                    </defs>
                    <image
                      href={`/providers/${provider.id}.png`}
                      x={nx - 14}
                      y={ny - 14}
                      width={28}
                      height={28}
                      clipPath={`url(#clip-${provider.id})`}
                      onError={() => {
                        setFailedImages((prev) => ({ ...prev, [provider.id]: true }));
                      }}
                    />
                  </>
                )}
              </g>

              {/* Provider label */}
              <text
                x={nx + labelOffsetX}
                y={ny + labelOffsetY}
                textAnchor={labelAnchor}
                dominantBaseline="central"
                fill={isHovered ? provider.color : "currentColor"}
                fontSize="11"
                fontWeight={isHovered ? "700" : "600"}
                fontFamily="Inter, system-ui, sans-serif"
                opacity={isHovered ? 1 : 0.75}
                style={{ transition: "all 0.2s ease", pointerEvents: "none" }}
              >
                {provider.name.length > 12
                  ? provider.name.slice(0, 12) + "…"
                  : provider.name}
              </text>
            </g>
          );
        })}

        {/* Center Tinobot node */}
        <g>
          {/* Pulsing ring animation */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius + 14}
            fill="none"
            stroke="rgba(139,92,246,0.15)"
            strokeWidth="1"
          >
            <animate
              attributeName="r"
              values={`${centerRadius + 10};${centerRadius + 22};${centerRadius + 10}`}
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.2;0.05;0.2"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Center node background */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius + 4}
            fill="rgba(139,92,246,0.08)"
          />

          {/* Center node border */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius}
            fill="var(--color-card, #1a1a2e)"
            stroke="rgba(139,92,246,0.7)"
            strokeWidth="2"
            filter="url(#nodeShadow)"
          />

          {/* Tinobot text */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(139,92,246,1)"
            fontSize="13"
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            Tinobot
          </text>
          <text
            x={cx}
            y={cy + 11}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(139,92,246,0.5)"
            fontSize="8"
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="1"
          >
            AI GATEWAY
          </text>
        </g>

        {/* Tooltip / pill label for hovered provider */}
        {hoveredId && (() => {
          const prov = providers.find((p) => p.id === hoveredId);
          if (!prov) return null;
          const idx = providers.indexOf(prov);
          const angle = (2 * Math.PI * idx) / providers.length - Math.PI / 2;
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          const pillY = ny - nodeRadius - 18;
          return (
            <g>
              <rect
                x={nx - 40}
                y={pillY - 10}
                width={80}
                height={20}
                rx="10"
                fill={prov.color}
                opacity="0.9"
              />
              <text
                x={nx}
                y={pillY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="9"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
                letterSpacing="0.5"
              >
                {prov.id.toUpperCase()}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-1 px-2">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 cursor-pointer transition-opacity"
            style={{ opacity: hoveredId && hoveredId !== p.id ? 0.4 : 1 }}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[10px] font-semibold text-text-muted">
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
