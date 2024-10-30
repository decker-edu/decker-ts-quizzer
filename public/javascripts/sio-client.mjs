import quizRenderer from "./renderer.mjs";
import {
  createWinnerInterface,
  createWaitInterface,
  createDoneInterface,
} from "./components.mjs";
import bwip from "./bwip.js";
import localization from "./localization.mjs";

const l10n = localization(navigator.language);

const clientArea = document.getElementById("client-area");

const url = new URL(window.location);
const prefix = url.href.split("client").shift();
const connectURL = new URL(prefix);

console.log(connectURL);

export let webSocket = io(`${connectURL.protocol}//${connectURL.host}`, {
  path: connectURL.pathname + "socket.io",
});

export function sendAnswers(answers) {
  webSocket.emit("answer", answers);
}

function getSessionID() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("session")) {
    return params.get("session");
  }
  return undefined;
}

function attach(session) {
  webSocket.emit("attach", session);
}

function attachByButton() {
  const id = document.getElementById("session-id");
  attach(id.value);
}

window.moduleConnect = attachByButton;

function showConnectInput() {
  const root = document.documentElement;
  root.classList.remove("connected");
}

function hideConnectInput() {
  const root = document.documentElement;
  root.classList.add("connected");
}

webSocket.on("connect", (event) => {
  clearClientArea();
  const session = getSessionID();
  if (session) {
    attach(session);
  } else {
    showConnectInput();
  }
});

function clearClientArea() {
  while (clientArea.firstElementChild) {
    clientArea.removeChild(clientArea.firstElementChild);
  }
}

webSocket.on("error", (message) => {
  console.error(message);
});

webSocket.on("quiz", (quiz) => {
  clearClientArea();
  if (quiz.type === "choice") {
    quizRenderer.renderChoiceQuiz(clientArea, quiz);
  } else if (quiz.type === "freetext") {
    quizRenderer.renderTextQuiz(clientArea, quiz);
  } else if (quiz.type === "selection") {
    quizRenderer.renderSelectQuiz(clientArea, quiz);
  } else if (quiz.type === "assignment") {
    quizRenderer.renderAssignmentQuiz(clientArea, quiz);
  }
});

webSocket.on("winner", () => {
  clearClientArea();
  const winnerElement = createWinnerInterface();
  clientArea.appendChild(winnerElement);
});

webSocket.on("done", () => {
  clearClientArea();
  const doneElement = createDoneInterface();
  clientArea.appendChild(doneElement);
});

webSocket.on("attached", (id) => {
  hideConnectInput();

  clearClientArea();
  const doneElement = createWaitInterface();
  clientArea.appendChild(doneElement);

  let url = new URL(window.location);
  url.search = `session=${id}`;

  history.replaceState({}, "", url);

  const canvas = document.getElementById("menu-qr-code");
  bwip.toCanvas(canvas, {
    bcid: "qrcode",
    text: window.location.toString(),
    scale: 8,
    includetext: true,
    textxalign: "center",
    eclevel: "L",
  });
  const label = document.getElementById("menu-session-label");
  label.innerText = l10n.sessionLabel.replace(/\{0\}/g, id);
});

const dialog = document.getElementById("share-dialog");
dialog.addEventListener("click", (event) => {
  dialog.close();
});

window.openDialog = () => {
  const dialog = document.getElementById("share-dialog");
  dialog.showModal();
};

const session_input = document.getElementById("session-id");
session_input.placeholder = l10n.sessionInput;

const connect_button = document.getElementById("connect-button");
connect_button.innerText = l10n.connectLabel;
