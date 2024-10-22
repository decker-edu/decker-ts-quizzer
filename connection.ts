import { Socket } from "socket.io";
import Session, { Quiz, get as getSession } from "./session";
import { connect } from "http2";

export default class SIOConnection {
  socket: Socket;
  session: Session | undefined;
  answers: string[] | undefined;

  constructor(socket: Socket) {
    const connection = this;
    this.socket = socket;
    this.session = undefined;
    this.socket.on("disconnect", (reason) => {
      console.log("disconnect reason", reason);
      if (
        reason === "server namespace disconnect" ||
        reason === "client namespace disconnect" ||
        reason === "server shutting down"
      ) {
        if (this.session) {
          this.session.detach(connection);
        }
      }
    });
    this.socket.on("ping", (callback) => {
      callback();
    });
    this.socket.on("attach", (sessionID, secret) => {
      const session = getSession(sessionID);
      if (session) {
        this.session = session;
        if (secret) {
          if (this.session.secret === secret) {
            this.session.setHost(connection);
          } else {
            this.socket.emit("error", "wrong secret");
            this.socket.disconnect(true);
          }
          return;
        }
        this.session.attach(connection);
      }
    });
    this.socket.on("quiz", (quiz) => {
      if (this.session && this.session.host === connection) {
        this.session.setQuiz(quiz);
      } else {
        this.socket.emit("error", "not host");
        this.socket.disconnect(true);
      }
    });
    this.socket.on("evaluate", () => {
      if (this.session && this.session.host === connection) {
        this.session.evaluate();
      } else {
        this.socket.emit("error", "not host");
        this.socket.disconnect(true);
      }
    });
    this.socket.on("answer", (answers) => {
      if (this.session) {
        this.answers = answers;
        this.session.addAnswer(connection, answers);
      }
    });
  }

  sendAttachedMessage(session: string) {
    this.socket.emit("attached", session);
  }

  sendReplacedMessage() {
    this.socket.emit("replaced");
  }

  sendQuiz(quiz: Quiz) {
    this.socket.emit("quiz", quiz);
  }

  sendState(connections: number, done: number, result: any) {
    if (!result) {
      this.socket.emit("state", connections, done);
    } else {
      this.socket.emit("state", connections, done, result);
    }
  }

  sendDone() {
    this.socket.emit("done");
  }

  sendWinner() {
    this.socket.emit("winner");
  }

  resetAnswers() {
    this.answers = undefined;
  }

  close() {
    this.socket.disconnect();
  }
}
