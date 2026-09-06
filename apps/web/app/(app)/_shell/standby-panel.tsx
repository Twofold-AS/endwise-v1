/**
 * Box 3 — empty standby for future detail panes.
 * Desktop only. Hairline against box 2. No fake content.
 */
export function StandbyPanel() {
  return (
    <aside
      data-shell-box="3"
      data-standby-panel
      className="hidden h-full w-[452px] shrink-0 flex-col border-border border-l bg-bg md:flex"
    >
      <header
        data-shell-topbar="3"
        className="h-[53px] w-[452px] shrink-0 border-border border-b bg-bg"
      />
      <div data-standby-body className="min-h-0 w-[452px] flex-1" />
    </aside>
  );
}
