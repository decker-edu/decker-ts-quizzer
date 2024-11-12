import { Socket } from "socket.io";
import Session, { Quiz, get as getSession } from "./session";

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
        reason === "server shutting down" ||
        reason === "transport close"
      ) {
        if (this.session) {
          this.session.detach(connection);
        }
      }
    });
    this.socket.on("ping", (callback) => {
      callback();
    });
    this.socket.on("attach", (sessionID, secret, callback) => {
      if (this.session) {
        this.session.detach(this);
      }
      if (typeof secret === "function") {
        callback = secret;
        secret = null;
      }
      if (typeof callback !== "function") {
        return;
      }
      const session = getSession(sessionID);
      if (session) {
        this.session = session;
        if (secret) {
          if (this.session.secret === secret) {
            callback(sessionID, null);
            this.session.setHost(connection);
          } else {
            callback(null, "wrong secret");
          }
          return;
        }
        callback(sessionID, null);
        this.session.attach(connection);
      } else {
        callback(null, "no session");
      }
    });
    this.socket.on("quiz", (quiz, callback) => {
      if (this.session && this.session.host === connection) {
        this.session.setQuiz(quiz);
      } else {
        if (callback && typeof callback === "function") {
          callback(null, "not host");
        }
        this.socket.emit("error", "not host");
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
    this.socket.on("answer", (quizNumber, answers) => {
      if (this.session) {
        const quiz = this.session.activeQuiz;
        if (quiz && quiz.number !== quizNumber) {
          this.socket.emit("error", "old quiz");
          this.sendQuiz(quiz);
        }
        this.answers = answers;
        this.session.addAnswer(connection, answers);
      }
    });
  }

  sendReplacedMessage() {
    this.socket.emit("replaced");
  }

  sendNotification(message: string) {
    this.socket.emit("notification", message);
  }

  sendQuiz(quiz: Quiz) {
    this.socket.emit("quiz", quiz);
  }

  sendParticipants(connections: number, done: number) {
    this.socket.emit("participants", connections, done);
  }

  sendResults(result: any) {
    this.socket.emit("result", result);
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
