import app from "./app";
import Debug from "debug";
import http from "http";
import { Server } from "socket.io";
import SIOConnection from "./connection";

const debug = Debug("decker-ts-quizzer");

const connections = new Map<string, SIOConnection>();

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/**
 * Create HTTP server.
 */

let server = http.createServer(app);

server.on("error", onError);
server.on("listening", onListening);

const io = new Server(server, {
  pingInterval: 10000,
  pingTimeout: 8000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 5 * 60 * 1000,
    skipMiddlewares: true,
  },
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  if (socket.recovered) {
    console.log("recovered connection: ", socket.id);
    const connection = connections.get(socket.id);
    if (connection) {
      if (connection.session && connection.session.activeQuiz) {
        connection.sendQuiz(connection.session.activeQuiz);
      }
      connection.sendNotification("reconnected");
    }
  } else {
    console.log("new connection: ", socket.id);
    const connection = new SIOConnection(socket);
    connections.set(socket.id, connection);
  }
});

/* old websocket code
let wss = new ws.Server({ server, path: "/api/websocket" });

wss.on("connection", function (ws: WebSocket) {
  const connection = new Connection(ws);
});
*/

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

interface Error {
  syscall: string;
  code: string;
}

function onError(error: Error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  if (addr) {
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    console.log("Listening on " + bind);
  }
}

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
