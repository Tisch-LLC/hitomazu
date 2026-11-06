/** アプリのロゴ：家の輪郭の中に、ゆるい線のチェック（「実家のことは、ひとまず大丈夫」） */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 16 L84 44 V84 H16 V44 Z" />
        <path d="M36 58 L47 69 L66 46" />
      </g>
    </svg>
  );
}
