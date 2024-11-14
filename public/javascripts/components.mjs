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
  message.innerHTML = "Bitte warten.<br>Es wurde noch kein Quiz gestartet.";

  container.append(message);
  return container;
}

export function createDoneInterface() {
  const container = document.createElement("div");
  container.className = "done-container";
  const message = document.createElement("span");
  message.innerHTML =
    "Das Quiz wurde ausgewertet.<br>Bitte warte auf das Nächste oder schließe diesen Tab.";
  container.appendChild(message);
  return container;
}
