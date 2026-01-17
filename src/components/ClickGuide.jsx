export function ClickGuide({ text }) {
  return (
    <div className="text-xs text-[--text-primary] bg-[--bg-card] border border-[--border-color] px-2 py-1 rounded shadow-md inline-block">
      {text}
    </div>
  );
}
