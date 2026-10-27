import { useId } from "react";
/** Decorative brand illustration; never represents a user's registered product. */
export function BakeryArt() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="bakery-art"
      viewBox="0 0 320 285"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id + "icing"} x2=".8" y2="1">
          <stop stopColor="#fffaf0" />
          <stop offset="1" stopColor="#ffcfdf" />
        </linearGradient>
        <linearGradient id={id + "cake"} x2="0" y2="1">
          <stop stopColor="#ff82ab" />
          <stop offset="1" stopColor="#d92c71" />
        </linearGradient>
        <linearGradient id={id + "cherry"} x2=".8" y2="1">
          <stop stopColor="#ff6897" />
          <stop offset="1" stopColor="#c80950" />
        </linearGradient>
        <radialGradient id={id + "halo"}>
          <stop stopColor="#ffe69c" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffe69c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="166" cy="143" r="130" fill={"url(#" + id + "halo)"} />
      <ellipse
        cx="162"
        cy="252"
        rx="119"
        ry="14"
        fill="#682142"
        opacity=".13"
      />
      <path d="M153 223h20v27h-20z" fill="#fff4d5" />
      <ellipse cx="163" cy="249" rx="42" ry="7" fill="#fff5de" />
      <ellipse cx="161" cy="222" rx="115" ry="17" fill="#d76c8a" />
      <ellipse cx="161" cy="216" rx="115" ry="17" fill="#fff9ed" />
      <path
        d="M68 135h187v67c0 27-187 27-187 0z"
        fill={"url(#" + id + "cake)"}
      />
      <path
        d="M69 180c50 21 137 21 185 0v13c-46 24-143 23-185 0z"
        fill="#fff0d0"
      />
      <ellipse cx="161" cy="136" rx="94" ry="24" fill="#8c3d53" />
      <path
        d="M68 136c0-35 186-35 187 0v19c-10 16-25-2-33 5-11 7-7 29-23 26s-8-28-24-26-13 14-27 11-10-13-24-13-12 17-27 12-11-21-29-19z"
        fill={"url(#" + id + "icing)"}
      />
      <ellipse cx="161" cy="131" rx="87" ry="19" fill="#fff6e6" />
      <path
        d="M109 119c-10-15 7-18 12-26 3 8 21 17 8 27M151 116c-12-16 8-18 12-30 5 12 23 18 9 31M195 120c-12-14 7-19 12-27 5 9 21 18 8 28"
        fill="#fffaf0"
      />
      <path
        d="M163 90c-4-21 6-34 21-40"
        fill="none"
        stroke="#47764b"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M178 62c-4-18 9-23 23-21-2 15-11 23-23 21" fill="#69a463" />
      <circle cx="157" cy="89" r="17" fill={"url(#" + id + "cherry)"} />
      <ellipse cx="151" cy="83" rx="5" ry="3" fill="white" opacity=".7" />
      <path
        d="m109 141 9 3m73-12 9-2m-41 11 2 6m66-7 6 4m-79-21-6 3m47-4 6-4"
        stroke="#eb6594"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g fill="#ffe49a">
        <path d="m45 70 4 12 12 4-12 4-4 12-4-12-12-4 12-4z" />
        <path d="m270 91 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
      </g>
      <g fill="#fbadc9">
        <circle cx="71" cy="52" r="4" />
        <circle cx="262" cy="192" r="5" />
        <circle cx="39" cy="173" r="3" />
      </g>
      <path
        d="m237 46 7 9m-13 3 8-6"
        stroke="#fff9ee"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
