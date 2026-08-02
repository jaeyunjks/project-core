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
    case "cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.3" />
          <circle cx="18" cy="20" r="1.3" />
          <path d="M2 3h2.2l2.1 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H5" />
        </svg>
      );
    case "bag":
      return (
        <svg {...common}>
          <path d="M6 8h12l-1 12H7L6 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 2.5V11c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V5.5L12 3z" />
        </svg>
      );
    case "car":
      return (
        <svg {...common}>
          <path d="M5 11l1.5-4A2 2 0 0 1 8.4 6h7.2a2 2 0 0 1 1.9 1.3L19 11" />
          <path d="M3 11h18v5a1 1 0 0 1-1 1h-1v-1H5v1H4a1 1 0 0 1-1-1z" />
          <circle cx="7.5" cy="16.5" r="1" />
          <circle cx="16.5" cy="16.5" r="1" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.7 12 20 12 20z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
        </svg>
      );
    case "coffee":
      return (
        <svg {...common}>
          <path d="M4 8h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
          <path d="M16 9h2.5a2 2 0 0 1 0 4H16" />
          <path d="M7 3.5v1.5M10 3.5v1.5" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <path d="M4 11h16v9H4z" />
          <path d="M3 7h18v4H3zM12 7v13" />
          <path d="M12 7S10.5 3 8.5 4.2 10.5 7 12 7zM12 7s1.5-4 3.5-2.8S13.5 7 12 7z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M3 12l8.5-8.5a1.5 1.5 0 0 1 1.1-.5H20a1 1 0 0 1 1 1v7.4a1.5 1.5 0 0 1-.5 1.1L12 21z" />
          <circle cx="16.5" cy="7.5" r="1.2" />
        </svg>
      );
    case "dots":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M3 12l8.5-8.5a1.5 1.5 0 0 1 1.1-.5H20a1 1 0 0 1 1 1v7.4a1.5 1.5 0 0 1-.5 1.1L12 21z" />
          <circle cx="16.5" cy="7.5" r="1.2" />
        </svg>
      );
  }
}
