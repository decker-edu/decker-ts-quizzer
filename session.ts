const sessions = new Map<string, Session>();

type Quiz = {
  type: "choice" | "selection" | "freetext" | "assignment";
  question: string;
  choices: Choice[];
};

type Choice = {
  votes: number;
  options: Answer[];
};

type Answer = {
  label: string;
  reason: string;
  correct: boolean;
  chosen: number;
};

export function get(id: string): Session | null {
  const session = sessions.get(id);
  if (session) {
    return session;
  } else {
    return null;
  }
}

export function register(id: string, session: Session): void {
  sessions.set(id, session);
}

function terminate(ws: WebSocket, message: string) {
  ws.send(JSON.stringify({ type: "error", message: message }));
  ws.close();
}

export class Connection {
  ws: WebSocket;
  session: Session | undefined;
  answers: string[] | undefined;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.session = undefined;
    this.answers = undefined;
    this.registerCallbacks();
  }

  registerCallbacks() {
    const connection = this;
    const ws = this.ws;
    ws.addEventListener("message", function message(event) {
      try {
        const data = event.data;
        const json = JSON.parse(data.toString());
        if (!json.type) {
          return terminate(ws, "No message type.");
        }
        if (json.type === "connect") {
          if (!json.session) {
            return terminate(ws, "No session id.");
          }
          const session = get(json.session);
          if (!session) {
            return terminate(ws, "Session not found.");
          }
          if (connection.session) {
            connection.session.removeConnection(connection);
          }
          connection.session = session;
          if (json.secret) {
            if (json.secret === session.secret) {
              session.setHost(connection);
            } else {
              return terminate(ws, "Wrong Secret");
            }
          } else {
            session.addConnection(connection);
          }
        }
        if (json.type === "ping") {
          return ws.send(JSON.stringify({ type: "pong", text: "" }));
        }
        if (json.type === "quiz") {
          if (!connection.session) {
            return terminate(ws, "The client is not connected to a session.");
          } else if (connection.session.host !== connection) {
            return terminate(ws, "The client is not the host of the session.");
          } else {
            connection.session.setQuiz(json.quiz);
          }
        }
        if (json.type === "evaluate") {
          if (!connection.session) {
            return terminate(ws, "The client is not connected to a session.");
          } else if (connection.session.host !== connection) {
            return terminate(ws, "The client is not the host of the session.");
          } else {
            connection.session.evaluate();
          }
        }
        if (json.type === "answer") {
          if (!json.answer) {
            return terminate(ws, "No answer given");
          } else {
            if (!Array.isArray(json.answer)) {
              return terminate(ws, "Answers are not an array");
            }
            connection.answers = json.answer;
            if (connection.session) {
              connection.session.sendQuizStateToHost(undefined);
            }
          }
        }
      } catch (error) {
        console.error(event);
        console.error(error);
      }
    });
    ws.addEventListener("close", function close(data) {
      if (connection.session) {
        connection.session.removeConnection(connection);
      }
    });
  }

  resetQuiz(quiz: Quiz) {
    this.answers = undefined;
    this.ws.send(JSON.stringify({ type: "quiz", quiz: quiz }));
  }
}

function sendHostReplacedMessage(connection: Connection) {
  connection.ws.send(JSON.stringify({ type: "replaced" }));
}

export default class Session {
  id: string;
  secret: string;
  host: Connection | undefined;
  connections: Connection[];
  activeQuiz: Quiz | undefined;
  result: any;

  constructor(id: string, secret: string) {
    this.id = id;
    this.secret = secret;
    this.connections = [];
  }

  setHost(connection: Connection | undefined) {
    if (this.host) {
      sendHostReplacedMessage(this.host);
    }
    this.host = connection;
  }

  sendToClients(message: any) {
    for (const connection of this.connections) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  addConnection(connection: Connection) {
    this.connections.push(connection);
    connection.ws.send(
      JSON.stringify({
        type: "sessionchange",
        operation: "connect",
        value: this.id,
      })
    );
    if (this.activeQuiz) {
      connection.ws.send(
        JSON.stringify({ type: "quiz", quiz: this.activeQuiz })
      );
    }
    if (this.host) {
      this.sendQuizStateToHost(undefined);
    }
  }

  removeConnection(connection: Connection) {
    const index = this.connections.indexOf(connection);
    if (index > -1) {
      const connection = this.connections.splice(index, 1)[0];
      if (connection.ws.readyState === connection.ws.OPEN) {
        connection.ws.send(
          JSON.stringify({
            type: "sessionchange",
            operation: "disconnect",
            value: this.id,
          })
        );
      }
    }
  }

  sendQuizStateToHost(result: any) {
    let done = 0;
    for (const connection of this.connections) {
      if (connection.answers) {
        done++;
      }
    }
    if (this.host) {
      const state = {
        type: this.activeQuiz?.type,
        connections: this.connections.length,
        done: done,
        result: result,
      };
      this.host.ws.send(JSON.stringify({ type: "state", state: state }));
    }
  }

  setQuiz(quiz: Quiz) {
    this.activeQuiz = quiz;
    for (const connection of this.connections) {
      connection.resetQuiz(quiz);
    }
  }

  evaluateChoiceQuiz(): [Connection[], any] {
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    const winners: Connection[] = [];
    const result: any = {};
    for (const option of this.activeQuiz.choices[0].options) {
      option.chosen = 0;
    }
    for (const connection of this.connections) {
      if (connection.answers) {
        for (const givenAnswer of connection.answers) {
          const answer = this.activeQuiz.choices[0].options.find(
            (answer) => answer.label === givenAnswer
          );
          if (answer) {
            answer.chosen++;
          }
        }
        let allCorrect: boolean = true;
        const correctAnswers = this.activeQuiz.choices[0].options.filter(
          (answer) => answer.correct
        );
        const correctStrings = correctAnswers.map((answer) => answer.label);
        for (const answer of correctStrings) {
          if (!connection.answers.includes(answer)) {
            allCorrect = false;
          }
        }
        if (allCorrect) {
          winners.push(connection);
        }
      } else {
        //ERROR: No given answers
      }
      for (const option of this.activeQuiz.choices[0].options) {
        result[option.label] = option.chosen;
      }
    }
    return [winners, result];
  }

  evaluateFreeQuiz(): [Connection[], any] {
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    const winners: Connection[] = [];
    const result: any[] = [];
    for (const choice of this.activeQuiz.choices) {
      result.push({});
    }
    for (const connection of this.connections) {
      let canWin = true;
      if (connection.answers) {
        for (let index = 0; index < this.activeQuiz.choices.length; index++) {
          const answer = connection.answers[index];
          if (result[index][answer]) {
            result[index][answer] = result[index][answer] + 1;
          } else {
            result[index][answer] = 1;
          }
          const possibleAnswers = this.activeQuiz.choices[index].options;
          const correctAnswers = possibleAnswers.filter(
            (answer) => answer.correct
          );
          const correctStrings: string[] = correctAnswers.map(
            (answer: Answer) => answer.label
          );
          if (!correctStrings.includes(answer)) {
            canWin = false;
          }
        }
      } else {
        canWin = false;
      }
      if (canWin) {
        winners.push(connection);
      }
    }
    return [winners, result];
  }

  evaluateSelectionQuiz(): [Connection[], any] {
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    let winners: Connection[] = [];
    let result: any = [];
    // Prepare the result array object
    for (const choice of this.activeQuiz.choices) {
      const pick: any = {};
      for (const option of choice.options) {
        pick[option.label] = 0;
      }
      result.push(pick);
    }
    for (const connection of this.connections) {
      let canWin = true;
      if (connection.answers) {
        for (let i = 0; i < connection.answers.length; i++) {
          const answer = connection.answers[i];
          result[i][answer] = result[i][answer] + 1;
          const possibleAnswers = this.activeQuiz.choices[i].options;
          const correctAnswers = possibleAnswers.filter(
            (answer) => answer.correct
          );
          const correctStrings: string[] = correctAnswers.map(
            (answer: Answer) => answer.label
          );
          if (!correctStrings.includes(answer)) {
            canWin = false;
          }
        }
      } else {
        canWin = false;
      }
      if (canWin) {
        winners.push(connection);
      }
    }
    return [winners, result];
  }

  evaluateAssignmentQuiz(): [Connection[], any] {
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    let winners: Connection[] = [];
    let result: any = [];
    const choices = this.activeQuiz.choices[0].options;
    const answers = [];
    const reasons = [];
    for (const choice of choices) {
      answers.push(choice.label);
      if (choice.reason) {
        reasons.push(choice.reason);
      }
    }
    const uniqueReasons = reasons.filter(
      (value, index, array) => array.indexOf(value) === index
    );
    for (const reason of uniqueReasons) {
      const object: any = { label: reason, assignments: {} };
      for (const answer of answers) {
        object.assignments[answer] = 0;
      }
      result.push(object);
    }
    const none: any = { label: "None", assignments: {} };
    for (const answer of answers) {
      none.assignments[answer] = 0;
    }
    result.push(none);
    for (const connection of this.connections) {
      let canWin = true;
      if (connection.answers) {
        const assignment: any = connection.answers[0];
        for (const label in assignment) {
          const reason = assignment[label];
          const object = result.find((object: any) => object.label === reason);
          object.assignments[label] = object.assignments[label] + 1;
          const answer = choices.find((choice) => choice.label === label);
          if (
            (!answer || answer.reason !== assignment[label]) &&
            answer?.reason !== undefined
          ) {
            canWin = false;
          }
        }
        if (canWin) {
          winners.push(connection);
        }
      }
    }
    return [winners, result];
  }

  evaluate() {
    if (!this.activeQuiz) {
      return;
    }
    let winners: Connection[] = [];
    let result: any = undefined;

    if (this.activeQuiz.type === "choice") {
      [winners, result] = this.evaluateChoiceQuiz();
    } else if (this.activeQuiz.type === "freetext") {
      [winners, result] = this.evaluateFreeQuiz();
    } else if (this.activeQuiz.type === "selection") {
      [winners, result] = this.evaluateSelectionQuiz();
    } else if (this.activeQuiz.type === "assignment") {
      [winners, result] = this.evaluateAssignmentQuiz();
    }
    for (const connection of this.connections) {
      connection.ws.send(JSON.stringify({ type: "done" }));
    }
    if (winners.length > 0) {
      const random = Math.floor(Math.random() * winners.length);
      const winner = winners.splice(random, 1)[0];
      winner.ws.send(JSON.stringify({ type: "winner" }));
    }
    this.sendQuizStateToHost(result);
  }
}
