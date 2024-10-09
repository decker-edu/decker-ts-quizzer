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

  responseMiliseconds: number = 0;
  lastPing: number = 0;
  missedPing: number = 0;

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
          return ws.send(JSON.stringify({ type: "pong" }));
        }
        if (json.type === "pong") {
          connection.responseMiliseconds =
            performance.now() - connection.lastPing;
          connection.missedPing = 0;
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
            if (connection.session) {
              connection.session.addAnswer(connection, json.answer);
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

  sendPing() {
    if (this.missedPing > 2) {
      console.log("connection lost");
      this.ws.close();
      return;
    }
    this.ws.send(
      JSON.stringify({ type: "ping", ms: this.responseMiliseconds })
    );
    this.lastPing = performance.now();
    this.missedPing++;
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
  answers: [Connection, string[]][];
  result: any;
  pinger: NodeJS.Timeout | undefined;

  constructor(id: string, secret: string) {
    this.id = id;
    this.secret = secret;
    this.connections = [];
    this.answers = [];
    this.pinger = undefined;
  }

  setHost(connection: Connection | undefined) {
    if (this.host) {
      sendHostReplacedMessage(this.host);
    }
    this.host = connection;
    this.startPing();
  }

  startPing() {
    const session = this;
    this.pinger = setInterval(() => {
      if (session.host) {
        session.host.sendPing();
      } else {
        clearInterval(session.pinger);
      }
    }, 1000);
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

  addAnswer(connection: Connection, answer: string[]) {
    this.answers.push([connection, answer]);
  }

  removeConnection(connection: Connection) {
    if (this.host === connection) {
      console.log(`[${this.id}] The host has left the session!`);
      if (this.pinger) {
        clearInterval(this.pinger);
        this.pinger = undefined;
      }
    }
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
    this.answers = [];
    for (const connection of this.connections) {
      connection.resetQuiz(quiz);
    }
  }

  evaluateChoiceQuiz(): [Connection[], any] {
    const winners: Connection[] = [];
    const result: any = {};

    if (!this.activeQuiz) {
      return [[], undefined];
    }
    /* Get correct answers and the labels of these answers */
    const correctAnswers = this.activeQuiz.choices[0].options.filter(
      (answer) => answer.correct
    );
    const correctLabels = correctAnswers.map((answer) => answer.label);

    /* Reset choosable option count for result */
    for (const option of this.activeQuiz.choices[0].options) {
      option.chosen = 0;
    }

    /* For each given answer, count chosen values */
    for (const [connection, answers] of this.answers) {
      /* A user can win if their answer includes all correct values and only the correct values */
      let canWin: boolean = true;
      for (const answer of answers) {
        const option = this.activeQuiz.choices[0].options.find(
          (option) => option.label === answer
        );
        if (option) {
          option.chosen++;
          if (!option.correct) {
            canWin = false;
          }
        }
      }
      for (const correctLabel of correctLabels) {
        if (!answers.includes(correctLabel)) {
          canWin = false;
          break;
        }
      }
      if (canWin) {
        winners.push(connection);
      }
    }
    for (const option of this.activeQuiz.choices[0].options) {
      result[option.label] = option.chosen;
    }
    return [winners, result];
  }

  evaluateFreeQuiz(): [Connection[], any] {
    const winners: Connection[] = [];
    const result: any[] = [];
    const correctAnswers = [];
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    /* Each answer field gets its own object */
    for (const choice of this.activeQuiz.choices) {
      result.push({});
      const correctChoices = choice.options.filter((answer) => answer.correct);
      const correctLabels = correctChoices.map((choice) => choice.label);
      correctAnswers.push(correctLabels);
    }
    /* Aggregate Answers */
    for (const [connection, answers] of this.answers) {
      let canWin = true;
      /* for each text field count each given answer */
      for (let index = 0; index < this.activeQuiz.choices.length; index++) {
        const answer = answers[index];
        if (result[index][answer]) {
          result[index][answer] = result[index][answer] + 1;
        } else {
          result[index][answer] = 1;
        }
        const correctLabels = correctAnswers[index];
        if (!correctLabels.includes(answer)) {
          canWin = false;
        }
      }
      if (canWin) {
        winners.push(connection);
      }
    }
    return [winners, result];
  }

  evaluateSelectionQuiz(): [Connection[], any] {
    const winners: Connection[] = [];
    const result: any = [];
    const correctAnswers = [];
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    // Prepare the result array object
    for (const choice of this.activeQuiz.choices) {
      const pick: any = {};
      for (const option of choice.options) {
        pick[option.label] = 0;
      }
      const correctChoices = choice.options.filter((answer) => answer.correct);
      const correctLabels = correctChoices.map((answer) => answer.label);
      correctAnswers.push(correctLabels);
      result.push(pick);
    }
    for (const [connection, answers] of this.answers) {
      let canWin = true;
      for (let index = 0; index < answers.length; index++) {
        const answer = answers[index];
        result[index][answer] = result[index][answer] + 1;
        const correctLabels = correctAnswers[index];
        if (!correctLabels.includes(answer)) {
          canWin = false;
        }
      }
      if (canWin) {
        winners.push(connection);
      }
    }
    return [winners, result];
  }

  evaluateAssignmentQuiz(): [Connection[], any] {
    let winners: Connection[] = [];
    let result: any = [];
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    /* An Assignment Quiz has only one choice entry */
    const choices = this.activeQuiz.choices[0].options;

    const answers = [];
    const reasons = [];

    /* Each choice represents an assignable object and its reason is the "correct" category */
    for (const choice of choices) {
      answers.push(choice.label);
      if (choice.reason) {
        reasons.push(choice.reason);
      }
    }
    /* If two objects have the same reason they share the same category so we can filter unique reasons */
    const uniqueReasons = reasons.filter(
      (value, index, array) => array.indexOf(value) === index
    );
    /* The result needs information about which objects have been assigned to which category */
    for (const reason of uniqueReasons) {
      const object: any = { label: reason, assignments: {} };
      for (const answer of answers) {
        object.assignments[answer] = 0;
      }
      result.push(object);
    }
    /* Create a category for an unassigned object */
    const none: any = { label: "None", assignments: {} };
    for (const answer of answers) {
      none.assignments[answer] = 0;
    }
    result.push(none);

    /* Each answer represents an assignment: label (object) -> reason (category) */
    for (const [connection, answers] of this.answers) {
      let canWin = true;
      const assignment: any = answers[0];
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
