import quizRenderer from "./renderer.mjs";
import {
  createWinnerInterface,
  createWaitInterface,
  createDoneInterface,
} from "./components.mjs";
const clientArea = document.getElementById("client-area");

import config from "./config.mjs";

let pingCount = 0;

function ping(socket) {
  pingCount++;
  socket.send(JSON.stringify({ type: "ping" }));
  if (pingCount > 1) {
    console.error("Missed Ping");
  }
}

const location = window.location;
let protocol = "wss:";
if (location.protocol === "http:") {
  protocol = "ws:";
}
let hostname = location.hostname;
let port = location.port;

const target = `${protocol}//${hostname}:${port}${config.subroute}/api/websocket`;
console.log(target);
export const connection = new WebSocket(target);

export function sendAnswers(answers) {
  connection.send(JSON.stringify({ type: "answer", answer: answers }));
}

function getSessionID() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("session")) {
    return params.get("session");
  }
  return undefined;
}

function connect(session) {
  connection.send(JSON.stringify({ type: "connect", session: session }));
}

function connectByButton() {
  const id = document.getElementById("session-id");
  connect(id.value);
}

window.moduleConnect = connectByButton;

function showConnectInput() {
  const container = document.getElementById("connect-area");
  container.removeAttribute("hidden");
}

function hideConnectInput() {
  const container = document.getElementById("connect-area");
  container.setAttribute("hidden", "");
}

connection.addEventListener("open", async (event) => {
  clearClientArea();
  clientArea.appendChild(createWaitInterface());
  setInterval(() => ping(connection), 1000);
  const session = getSessionID();
  if (session) {
    connect(session);
  } else {
    showConnectInput();
  }
});

function clearClientArea() {
  while (clientArea.firstElementChild) {
    clientArea.removeChild(clientArea.firstElementChild);
  }
}

export async function handleMessage(event) {
  try {
    const json = JSON.parse(event.data);
    if (json.type === "error") {
      console.error(`Websocket Error: ${json.message}`);
    }
    if (json.type === "status") {
      console.log(`Websocket Status: ${json.value}`);
    }
    if (json.type === "quiz") {
      clearClientArea();
      if (json.quiz.type === "choice") {
        quizRenderer.renderChoiceQuiz(clientArea, json.quiz);
      } else if (json.quiz.type === "freetext") {
        quizRenderer.renderTextQuiz(clientArea, json.quiz);
      } else if (json.quiz.type === "selection") {
        quizRenderer.renderSelectQuiz(clientArea, json.quiz);
      } else if (json.quiz.type === "assignment") {
        quizRenderer.renderAssignmentQuiz(clientArea, json.quiz);
      }
    }
    if (json.type === "winner") {
      clearClientArea();
      const winnerElement = createWinnerInterface();
      clientArea.appendChild(winnerElement);
    }
    if (json.type === "done") {
      clearClientArea();
      clientArea.appendChild(createDoneInterface());
    }
    if (json.type === "sessionchange") {
      if (json.operation === "connect") {
        hideConnectInput();
      }
    }
    if (json.type === "pong") {
      pingCount = 0;
    }
    if (json.type === "state") {
    }
  } catch (error) {
    console.error(error);
  }
}

connection.addEventListener("message", handleMessage);

connection.addEventListener("close", (event) => {
  console.log("Websocket: Closed");
});
