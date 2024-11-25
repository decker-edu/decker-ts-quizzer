import quizRenderer from "./renderer-debug.mjs";
import {
  createWinnerInterface,
  createWaitInterface,
  createDoneInterface,
} from "./components.mjs";
import bwip from "./bwip.js";
import localization from "./localization.mjs";

const l10n = localization(navigator.language);

const clientArea = document.getElementById("client-area");

const base = document.getElementsByTagName("base")[0];

const connectURL = new URL(base.href);

let id = window.location.pathname.split("/").pop();

export let webSocket = io(`${connectURL.protocol}//${connectURL.host}`, {
  path: connectURL.pathname + "socket.io",
});

export function sendAnswers(answers) {
  webSocket.emit("answer", currentQuiz.number, answers);
}

function getSessionID() {
  if (id !== "") {
    return id;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.has("session")) {
    return params.get("session");
  }
  return undefined;
}

function attach(session) {
  webSocket.emit("attach", session, null, (session, error) => {
    if (error) {
      debug("[ERROR] attach()");
      debug(error);
      // postNotification(error, "error");
    } else {
      hideConnectInput();

      clearClientArea();
      const waitElement = createWaitInterface();
      clientArea.appendChild(waitElement);

      let url = new URL(base.href + session);
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
      label.innerText = l10n.sessionLabel.replace(/\{0\}/g, session);
    }
  });
}

function attachViaInput() {
  const id = document.getElementById("session-id");
  attach(id.value);
}

function showConnectInput() {
  const root = document.documentElement;
  root.classList.remove("connected");
}

function hideConnectInput() {
  const root = document.documentElement;
  root.classList.add("connected");
}

function debug(message) {
  const element = document.getElementById("debug");
  const div = document.createElement("div");
  element.appendChild(div);
  div.innerText = message;
}

webSocket.on("connect", (event) => {
  debug("[SOCKET] connect");
  if (!webSocket.recovered) {
    clearClientArea();
    const session = getSessionID();
    if (session) {
      attach(session);
    } else {
      showConnectInput();
    }
  }
});

webSocket.on("reconnected", (session) => {
  if (!session) {
    const session = getSessionID();
    if (session) {
      attach(session);
    } else {
      showConnectInput();
    }
  }
});

function clearClientArea() {
  while (clientArea.firstElementChild) {
    clientArea.removeChild(clientArea.firstElementChild);
  }
}

function renderQuiz(quiz) {
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
}

function postNotification(message, cls) {
  const popup = document.createElement("div");
  popup.classList.add("message-popup");
  if (cls) {
    popup.classList.add(cls);
  }
  popup.innerText = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2000);
}

webSocket.on("error", (message) => {
  debug("[SOCKET] error");
  debug(message);
  console.error(message);
  // postNotification(message, "error");
});

webSocket.on("notification", (message) => {
  debug("[SOCKET] notification");
  debug(message);
  // postNotification(message);
});

webSocket.on("disconnect", (reason) => {
  debug("[SOCKET] disconnect");
  debug(reason);
  // postNotification(reason, "error");
});

let currentQuiz = undefined;

webSocket.on("quiz", (quiz) => {
  debug("[SOCKET] quiz");
  if (!currentQuiz || currentQuiz.number !== quiz.number) {
    currentQuiz = quiz;
    renderQuiz(quiz);
  }
});

webSocket.on("winner", () => {
  debug("[SOCKET] winner");
  clearClientArea();
  const winnerElement = createWinnerInterface();
  clientArea.appendChild(winnerElement);
});

webSocket.on("done", () => {
  debug("[SOCKET] done");
  clearClientArea();
  const doneElement = createDoneInterface();
  clientArea.appendChild(doneElement);
});

webSocket.on("attached", (id) => {
  debug("[SOCKET] attached");
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
session_input.addEventListener("keyup", (event) => {
  if (session_input.value.length === 4) {
    attachViaInput();
  }
});

session_input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    attachViaInput();
  }
});

const connect_button = document.getElementById("connect-button");
connect_button.innerText = l10n.connectLabel;

const share_button = document.getElementById("menu-button");
share_button.title = l10n.share;
share_button.ariaLabel = l10n.share;
