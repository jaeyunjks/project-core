import type { ReactElement } from "react";

interface Props {
  icon: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Pure-SVG category icons matching the design brief.
 * Add new icon keys here when categories expand.
 */
export function CategoryIcon({
  icon,
  size = 15,
  color = "currentColor",
  strokeWidth = 1.6,
}: Props): ReactElement {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...common}>
          <path d="M6 2v6a3 3 0 003 3h0a3 3 0 003-3V2" />
          <path d="M9 11v11" />
          <path d="M18 2c-1.5 0-3 1-3 4v5c0 1 1 2 2 2h1v9" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      );
    case "circle-plus":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );
    case "dots":
    default:
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      );
  }
}
