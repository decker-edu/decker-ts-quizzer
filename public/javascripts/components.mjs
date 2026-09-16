import localization from "./localization.mjs";

const l10n = localization(navigator.language);

export function createWinnerInterface() {
  const container = document.createElement("div");
  container.className = "winner-container";

  const message = document.createElement("span");
  message.className = "winner-message";
  message.innerText = l10n.won;

  container.appendChild(message);
  return container;
}

export function createWaitInterface() {
  const container = document.createElement("div");
  container.className = "wait-container";
  const message = document.createElement("span");
  message.innerHTML = l10n.pleaseWait;

  container.append(message);
  return container;
}

export function createDoneInterface() {
  const container = document.createElement("div");
  container.className = "done-container";
  const message = document.createElement("span");
  message.innerHTML = l10n.done;
  container.appendChild(message);
  return container;
}
