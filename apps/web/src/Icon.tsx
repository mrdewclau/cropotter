import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H5v20h14V7zM14 2v6h5M8 13h8M8 17h6" />
      </>
    ),
    link: (
      <>
        <path
          d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"
          transform="translate(1 0)"
        />
      </>
    ),
    download: (
      <>
        <path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5z" />
        <path d="m8 11 3 3 5-6" />
      </>
    ),
    crop: (
      <>
        <path d="M6 2v16h16M2 6h16v16" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    left: <path d="m15 5-7 7 7 7" />,
    right: <path d="m9 5 7 7-7 7" />,
    rotate: (
      <>
        <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    share: (
      <>
        <path d="M12 16V2M7 7l5-5 5 5M5 12H3v10h18V12h-2" />
      </>
    ),
    alert: (
      <>
        <path d="m12 2 10 19H2zM12 8v6M12 17h.01" />
      </>
    ),
    zip: (
      <>
        <path d="M14 2H5v20h14V7zM14 2v6h5M10 3v2m0 2v2m0 2v2m0 2v3h3v-3z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] ?? paths.file}
    </svg>
  );
}
