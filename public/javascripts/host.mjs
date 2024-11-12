import {
  testChoiceQuiz,
  testSelectQuiz,
  testAssignQuiz,
  testTextQuiz,
  testSession,
  createTestSession,
} from "./test.mjs";

const base = document.getElementsByTagName("base")[0];

const connectURL = new URL(base.href);

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
  const joinLink = document.getElementById("joinLink");
  joinLink.href = `/${testSession.id}`;

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

socket.io.on("ping", () => {
  addHostMessage("[INTERNAL] SOCKET.IO.PING");
});

socket.on("message", addHostMessage);

socket.on("connect", async (event) => {
  addHostMessage(`[CONNECTED]`);
  if (socket.recovered) {
    addHostMessage(`[SOCKET RECOVERED]`);
    return;
  }
  addHostMessage(`[NEW SOCKET]`);
  try {
    if (!testSession.id) {
      addHostMessage(`[REQUEST NEW SESSION]`);
      await createTestSession();
    }
    socket.emit(
      "attach",
      testSession.id,
      testSession.secret,
      (confirm, error) => {
        if (error) {
          addHostMessage(`[ATTACH ERROR] ${error}`);
        } else {
          addHostMessage(`[ATTACH CONFIRM] ${confirm}`);
        }
      }
    );
    makeHostButtonsFunctional();
  } catch (error) {
    addHostMessage(`[ON CONNECT ERROR]: ${error}`);
    return;
  }
});

socket.on("error", (message) => {
  addHostMessage(`[ERROR] ${message}`);
});

socket.on("participants", (connections, done) => {
  addHostMessage(`Connections: ${connections} Done: ${done}`);
});

socket.on("result", (result) => {
  addHostMessage(JSON.stringify(result, null, 2));
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
  const log = document.getElementById("log");
  const div = document.createElement("div");
  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.innerText = performance.now();
  div.innerText = message;
  log.appendChild(div);
}
