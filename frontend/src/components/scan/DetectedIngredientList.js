import Icon from "@/components/ui/Icon";

const STATUS_CONFIG = {
  critical:     { bar: "bg-red-400",    badge: "bg-red-100 text-red-700",       icon: "text-red-400" },
  expiring_soon:{ bar: "bg-orange-400", badge: "bg-orange-100 text-orange-700", icon: "text-orange-400" },
  fresh:        { bar: "bg-emerald-400",badge: "bg-emerald-50 text-emerald-700",icon: "text-emerald-500" },
};

function getConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.fresh;
}

function expiryLabel(statusText, status) {
  if (!statusText) return null;
  if (status === "critical") return "Today";
  const match = statusText.match(/(\d+)/);
  if (match) return `${match[1]}d`;
  return statusText;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

export default function DetectedIngredientList({
  items = [],
  newCount,
  deletingIds = new Set(),
  clearingAll = false,
  onDelete,
  onClearAll,
}) {
  const hasItems = items.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">Pantry</h3>
          {hasItems && (
            <span className="text-xs text-slate-400 font-medium tabular-nums">
              {items.length} items
            </span>
          )}
          {newCount != null && newCount > 0 && (
            <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              +{newCount} new
            </span>
          )}
        </div>
        {hasItems && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={clearingAll}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {clearingAll ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-red-400" />
            ) : (
              <Icon name="delete_sweep" className="text-sm" />
            )}
            Clear all
          </button>
        )}
      </div>

      {/* List */}
      {!hasItems ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 py-10 text-center">
          <Icon name="kitchen" className="text-3xl text-slate-300 mb-2 block" />
          <p className="text-sm text-slate-400">No ingredients yet</p>
          <p className="text-xs text-slate-300 mt-0.5">Scan your fridge to populate</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden max-h-[480px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(({ id, name, icon, status, statusText }, idx) => {
            const config = getConfig(status);
            const isDeleting = deletingIds.has(id);
            const label = expiryLabel(statusText, status);
            const isLast = idx === items.length - 1;

            return (
              <div
                key={id}
                className={`flex items-center gap-3 pl-0 pr-3 py-2.5 transition-opacity ${isDeleting ? "opacity-40 pointer-events-none" : ""} ${!isLast ? "border-b border-slate-50" : ""}`}
              >
                {/* Left status bar */}
                <div className={`w-1 self-stretch rounded-r-full shrink-0 ${config.bar}`} />

                {/* Icon */}
                <span className={`shrink-0 ${config.icon}`}>
                  <Icon name={icon || "eco"} className="text-lg" />
                </span>

                {/* Name */}
                <p className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">
                  {capitalize(name)}
                </p>

                {/* Expiry badge */}
                {label && (
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                    {label}
                  </span>
                )}

                {/* Delete */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(id)}
                    disabled={isDeleting}
                    aria-label={`Remove ${name}`}
                    className="shrink-0 p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    {isDeleting ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-red-400 block" />
                    ) : (
                      <Icon name="close" className="text-sm" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
