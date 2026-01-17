/**
 * VersionBadge - Displays app version and build info.
 * Small, subtle indicator positioned in the corner.
 */

export function VersionBadge() {
  const version = __APP_VERSION__;
  const gitHash = __GIT_HASH__;

  return (
    <div
      className="fixed bottom-2 right-2 z-40 text-[10px] text-gray-400 opacity-60 hover:opacity-100 transition-opacity select-none pointer-events-none"
      title={`Build: ${__BUILD_TIME__}`}
    >
      v{version}
      <span className="text-gray-500">·</span>
      {gitHash}
    </div>
  );
}
