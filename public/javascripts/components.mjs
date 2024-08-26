export function createWinnerInterface() {
  const container = document.createElement("div");
  container.className = "winner-container";

  const message = document.createElement("span");
  message.className = "winner-message";
  message.innerText = "! GEWONNEN !";

  container.appendChild(message);
  return container;
}

export function createWaitInterface() {
  const container = document.createElement("div");
  container.className = "wait-container";
  const message = document.createElement("span");
  message.innerText = "Bitte warten! Es wurde noch kein Quiz gestartet.";

  container.append(message);
  return container;
}

export function createDoneInterface() {
  const container = document.createElement("div");
  container.className = "done-container";
  const message = document.createElement("span");
  message.innerText =
    "Das Quiz wurde ausgeweret.\nBitte warte auf das nächste oder schließe diesen Tab.";
  container.appendChild(message);
  return container;
}
