import { handleMessage, connection } from "./client.mjs";
import {
  testChoiceQuiz,
  testSelectQuiz,
  testAssignQuiz,
  testTextQuiz,
  testSession,
  createTestSession,
} from "./test.mjs";

const location = window.location;
let protocol = "wss:";
if (location.protocol === "http:") {
  protocol = "ws:";
}
let hostname = location.hostname;
let port = location.port;

export const host = new WebSocket(
  `${protocol}//${hostname}:${port}/api/websocket`
);

function showHostButtons() {
  const element = document.getElementById("host-buttons");
  if (!element) {
    return;
  }
  element.removeAttribute("hidden");
  const span = document.createElement("span");
  span.innerText = `${testSession.id}, ${testSession.secret}`;
  element.appendChild(span);
  const sendButton = document.getElementById("setTestButton");
  sendButton.addEventListener("click", () => {
    host.send(JSON.stringify({ type: "quiz", quiz: testAssignQuiz }));
  });
  const evalButton = document.getElementById("evaluateButton");
  evalButton.addEventListener("click", () => {
    host.send(JSON.stringify({ type: "evaluate" }));
  });
}

host.addEventListener("open", async (event) => {
  try {
    await createTestSession();
    host.send(
      JSON.stringify({
        type: "connect",
        session: testSession.id,
        secret: testSession.secret,
      })
    );
    showHostButtons();
  } catch (error) {
    console.error(error);
    return;
  }
  if (connection.readyState !== connection.OPEN) {
    connection.addEventListener("open", () => {
      connection.send(
        JSON.stringify({ type: "connect", session: testSession.id })
      );
    });
  } else {
    connection.send(
      JSON.stringify({ type: "connect", session: testSession.id })
    );
  }
});

export function addHostMessage(message) {
  return;
  /*  const item = document.createElement("div");
  item.innerText = message;
  hostArea.appendChild(item); */
}

host.addEventListener("message", handleMessage);
