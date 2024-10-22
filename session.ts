import SIOConnection from "./connection";

const sessions = new Map<string, Session>();

export type Quiz = {
  type: "choice" | "selection" | "freetext" | "assignment";
  question: string;
  choices: Choice[];
};

export type Choice = {
  votes: number;
  options: Answer[];
};

export type Answer = {
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

export default class Session {
  id: string;
  secret: string;
  host: SIOConnection | undefined;
  connections: SIOConnection[];
  activeQuiz: Quiz | undefined;
  answers: [SIOConnection, string[]][];
  result: any;

  constructor(id: string, secret: string) {
    this.id = id;
    this.secret = secret;
    this.connections = [];
    this.answers = [];
  }

  setHost(connection: SIOConnection | undefined) {
    if (this.host) {
      this.host.sendReplacedMessage();
    }
    this.host = connection;
  }

  broadcast(event: string, message: any) {
    for (const connection of this.connections) {
      connection.socket.emit(event, message);
    }
  }

  attach(connection: SIOConnection) {
    this.connections.push(connection);
    connection.sendAttachedMessage(this.id);
    if (this.activeQuiz) {
      connection.sendQuiz(this.activeQuiz);
    }
    this.sendQuizStateToHost(undefined);
  }

  addAnswer(connection: SIOConnection, answer: string[]) {
    this.answers.push([connection, answer]);
    this.sendQuizStateToHost(undefined);
  }

  detach(connection: SIOConnection) {
    if (this.host === connection) {
      console.log(`[${this.id}] The host has left the session!`);
      this.host = undefined;
      return;
    }
    const index = this.connections.indexOf(connection);
    if (index > -1) {
      const connection = this.connections.splice(index, 1)[0];
      connection.close();
    }
    this.sendQuizStateToHost(undefined);
  }

  sendQuizStateToHost(result: any) {
    if (this.host) {
      let done = 0;
      for (const connection of this.connections) {
        if (connection.answers) {
          done++;
        }
      }
      this.host.sendState(this.connections.length, done, result);
    }
  }

  setQuiz(quiz: Quiz) {
    this.activeQuiz = quiz;
    this.answers = [];
    for (const connection of this.connections) {
      connection.resetAnswers();
      connection.sendQuiz(quiz);
    }
    this.sendQuizStateToHost(undefined);
  }

  evaluateChoiceQuiz(): [SIOConnection[], any] {
    const winners: SIOConnection[] = [];
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

  evaluateFreeQuiz(): [SIOConnection[], any] {
    const winners: SIOConnection[] = [];
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

  evaluateSelectionQuiz(): [SIOConnection[], any] {
    const winners: SIOConnection[] = [];
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

  evaluateAssignmentQuiz(): [SIOConnection[], any] {
    let winners: SIOConnection[] = [];
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
    let winners: SIOConnection[] = [];
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
      connection.sendDone();
    }
    if (winners.length > 0) {
      const random = Math.floor(Math.random() * winners.length);
      const winner = winners.splice(random, 1)[0];
      winner.sendWinner();
    }
    this.sendQuizStateToHost(result);
    // Reset internal state
    this.activeQuiz = undefined;
    for (const connection of this.connections) {
      connection.resetAnswers();
    }
  }
}
