import quizRenderer from "./renderer.mjs";
import {
  createWinnerInterface,
  createWaitInterface,
  createDoneInterface,
} from "./components.mjs";
import bwip from "./bwip.js";

const clientArea = document.getElementById("client-area");

export let webSocket = io();

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
  const container = document.getElementById("connect-area");
  container.removeAttribute("hidden");
}

function hideConnectInput() {
  const container = document.getElementById("connect-area");
  container.setAttribute("hidden", "");
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
  clientArea.appendChild(createDoneInterface());
});

webSocket.on("attached", (id) => {
  hideConnectInput();

  clearClientArea();
  clientArea.appendChild(createWaitInterface());

  let url = new URL(window.location);
  url.search = `session=${id}`;

  history.replaceState({}, "", url);

  const canvas = document.getElementById("menu-qr-code");
  bwip.toCanvas(canvas, {
    bcid: "qrcode",
    text: window.location.toString(),
    scale: 16,
    includetext: true,
    textxalign: "center",
    eclevel: "L",
  });
  const label = document.getElementById("menu-session-label");
  label.innerText = id;
});

const dialog = document.getElementById("share-dialog");
dialog.addEventListener("click", (event) => {
  dialog.close();
});

window.openDialog = () => {
  const dialog = document.getElementById("share-dialog");
  dialog.showModal();
};
