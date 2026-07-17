export default function BrandLogo({ className = '' }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/assets/360-zhihui-logo.png"
      alt="360智汇 · Know-how Hub"
    />
  );
}
