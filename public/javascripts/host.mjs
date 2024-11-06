import {
  testChoiceQuiz,
  testSelectQuiz,
  testAssignQuiz,
  testTextQuiz,
  testSession,
  createTestSession,
} from "./test.mjs";

const url = new URL(window.location);
const prefix = url.href.split("test").shift();
const connectURL = new URL(prefix);

console.log(connectURL);

export let socket = io(`${connectURL.protocol}//${connectURL.host}`, {
  path: connectURL.pathname + "socket.io",
});

function makeHostButtonsFunctional() {
  const element = document.getElementById("host-buttons");
  if (!element) {
    return;
  }
  const choiceButton = document.getElementById("choiceTestButton");
  choiceButton.addEventListener("click", () => {
    socket.emit("quiz", testChoiceQuiz);
  });
  const selectButton = document.getElementById("selectTestButton");
  selectButton.addEventListener("click", () => {
    socket.emit("quiz", testSelectQuiz);
  });
  const freetextButton = document.getElementById("freetextTestButton");
  freetextButton.addEventListener("click", () => {
    socket.emit("quiz", testTextQuiz);
  });
  const assignmentButton = document.getElementById("assignmentTestButton");
  assignmentButton.addEventListener("click", () => {
    socket.emit("quiz", testAssignQuiz);
  });
  const evalButton = document.getElementById("evaluateButton");
  evalButton.addEventListener("click", () => {
    socket.emit("evaluate");
  });
  const buttons = [
    choiceButton,
    selectButton,
    freetextButton,
    assignmentButton,
    evalButton,
  ];
  for (const button of buttons) {
    button.disabled = false;
  }
}

socket.on("message", addHostMessage);

socket.on("connect", async (event) => {
  if (socket.recovered) {
    return;
  }
  try {
    await createTestSession();
    socket.emit("attach", testSession.id, testSession.secret);
    makeHostButtonsFunctional();
  } catch (error) {
    addHostMessage(`[ON CONNECT ERROR]: ${error}`);
    return;
  }
});

socket.on("error", (message) => {
  addHostMessage(`[ERROR] ${message}`);
});

socket.on("state", (connections, done, result) => {
  if (result) {
    addHostMessage(JSON.stringify(result, null, 2));
  } else {
    addHostMessage(`Connections: ${connections} Done: ${done}`);
  }
});

socket.on("disconnect", (reason, details) => {
  addHostMessage("[DISCONNECTED]");
  if (reason) {
    addHostMessage(reason);
  }
  if (details) {
    addHostMessage(JSON.stringify(details, null, 2));
  }
});

window.closeSocket = function () {
  if (socket && socket.io && socket.io.engine) {
    socket.io.engine.close();
  }
};

export function addHostMessage(message) {
  console.log(message);
  const log = document.getElementById("log");
  const div = document.createElement("div");
  div.innerText = message;
  log.appendChild(div);
}
