const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
function selectTab(id, moveFocus = false) {
  const selected =
    tabs.find((tab) => tab.getAttribute("aria-controls") === id) ?? tabs[0];
  const changed = selected.getAttribute("aria-selected") !== "true";
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of panels)
    panel.hidden = panel.id !== selected.getAttribute("aria-controls");
  for (const note of document.querySelectorAll("[data-agent-view]"))
    note.hidden =
      note.dataset.agentView !== selected.getAttribute("aria-controls");
  const dialogs = changed ? [...document.querySelectorAll("dialog[open]")] : [];
  for (const dialog of dialogs) dialog.close();
  if (moveFocus || dialogs.length) selected.focus({ preventScroll: true });
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener("click", () => {
    const id = tab.getAttribute("aria-controls");
    selectTab(id);
    history.replaceState(null, "", `#${id}`);
  });
  tab.addEventListener("keydown", (event) => {
    const offsets = {
      ArrowRight: 1,
      ArrowLeft: -1,
      Home: -index,
      End: tabs.length - index - 1,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = tabs[(index + offsets[event.key] + tabs.length) % tabs.length];
    const id = next.getAttribute("aria-controls");
    selectTab(id, true);
    history.replaceState(null, "", `#${id}`);
  });
}
selectTab(location.hash.slice(1));
addEventListener("hashchange", () => selectTab(location.hash.slice(1)));
for (const opener of document.querySelectorAll("[data-dialog]")) {
  opener.addEventListener("click", () => {
    const dialog = document.getElementById(opener.dataset.dialog);
    dialog.addEventListener(
      "close",
      () => {
        const active = document.activeElement;
        if (
          active &&
          active !== document.body &&
          !dialog.contains(active) &&
          active.getClientRects().length
        )
          return;
        const target = opener.getClientRects().length
          ? opener
          : tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
        target?.focus({ preventScroll: true });
      },
      { once: true },
    );
    dialog.showModal();
  });
}
for (const closer of document.querySelectorAll("[data-close]")) {
  closer.addEventListener("click", () => closer.closest("dialog").close());
}
