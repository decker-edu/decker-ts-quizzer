import SIOConnection from "./connection";

import util from "util";

const sessions = new Map<string, Session>();

function cleanOldSessions() {
  console.log("[SESSION] Cleaning old session");
  const remove = [];
  for (const key of sessions.keys()) {
    const session = sessions.get(key);
    if (
      session &&
      session.mostRecentInteraction + 1000 * 60 * 60 * 4 < Date.now()
    ) {
      remove.push(key);
    }
  }
  for (const key of remove) {
    sessions.delete(key);
    console.log("[SESSION] Deleting session " + key);
  }
}

export let cleanInterval: NodeJS.Timeout;

export function startCleanInterval() {
  console.log("[SESSION] Starting cleaning interval.");
  cleanInterval = setInterval(cleanOldSessions, 1000 * 60 * 60);
}

export type Quiz = {
  type: "choice" | "selection" | "freetext" | "assignment";
  choices: Choice[];
  number: number;
};

export type Choice = {
  votes: number;
  options: Answer[];
  categories: Category[];
};

export type Category = {
  number: number;
};

export type Answer = {
  label?: string;
  reason: number;
  correct: boolean;
  letter: string;
};

type ChoiceResult = {
  items: ChoiceResultItem[];
};

type ChoiceResultItem = {
  letter: string;
  chosen: number;
  correct: boolean;
};

type TextResult = {
  items: TextItem[][];
};

type TextItem = {
  text: string;
  count: number;
};

type AssignmentResult = {
  assignments: Assignment[];
};

type Assignment = {
  letter: string;
  number: number;
  correct: boolean;
  count: number;
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
  quizNumber: number;
  answers: [SIOConnection, string[]][];
  result: any;
  mostRecentInteraction: number;

  constructor(id: string, secret: string) {
    this.id = id;
    this.secret = secret;
    this.connections = [];
    this.answers = [];
    this.quizNumber = 0;
    this.mostRecentInteraction = Date.now();
  }

  setHost(connection: SIOConnection | undefined) {
    if (this.host) {
      this.host.sendReplacedMessage();
    }
    this.host = connection;
    this.mostRecentInteraction = Date.now();
  }

  broadcast(event: string, message: any) {
    for (const connection of this.connections) {
      connection.socket.emit(event, message);
    }
  }

  attach(connection: SIOConnection) {
    const index = this.connections.indexOf(connection);
    if (index === -1) {
      this.connections.push(connection);
    }
    if (this.activeQuiz) {
      connection.sendQuiz(this.activeQuiz);
    }
    this.sendParticipants();
  }

  detach(connection: SIOConnection) {
    if (this.host === connection) {
      console.log(`[${this.id}] The host has left the session!`);
      this.host = undefined;
      return;
    }
    const index = this.connections.indexOf(connection);
    if (index > -1) {
      this.connections.splice(index, 1)[0];
    }
    connection.session = null;
    this.sendParticipants();
  }

  addAnswer(connection: SIOConnection, answer: string[]) {
    this.answers.push([connection, answer]);
    this.sendParticipants();
  }

  sendParticipants() {
    if (this.host) {
      let done = 0;
      for (const connection of this.connections) {
        if (connection.answers) {
          done++;
        }
      }
      this.host.sendParticipants(this.connections.length, done);
    }
  }

  sendResults(result: any) {
    if (this.host) {
      this.host.sendResults(result);
    }
  }

  setQuiz(quiz: Quiz) {
    this.quizNumber = this.quizNumber + 1;
    this.activeQuiz = quiz;
    this.activeQuiz.number = this.quizNumber;
    this.answers = [];
    for (const connection of this.connections) {
      connection.resetAnswers();
      connection.sendQuiz(quiz);
    }
    this.sendParticipants();
    this.mostRecentInteraction = Date.now();
  }

  evaluateChoiceQuiz(): [SIOConnection[], any] {
    const winners: SIOConnection[] = [];
    const result: ChoiceResult = {
      items: [],
    };

    if (!this.activeQuiz) {
      return [[], result];
    }
    /* Get correct answers and the labels of these answers */
    const correctAnswers = this.activeQuiz.choices[0].options.filter(
      (answer) => answer.correct
    );
    const correctLetters = correctAnswers.map((answer) => answer.letter);
    for (const option of this.activeQuiz.choices[0].options) {
      const resultItem: ChoiceResultItem = {
        letter: option.letter,
        correct: option.correct,
        chosen: 0,
      };
      result.items.push(resultItem);
    }

    /* For each given answer, count chosen values */
    for (const [connection, answers] of this.answers) {
      /* A user can win if their answer includes all correct values and only the correct values */
      let canWin: boolean = true;
      for (const answer of answers) {
        const item = result.items.find((item) => item.letter === answer);
        if (item) {
          item.chosen++;
          if (!item.correct) {
            canWin = false;
          }
        }
      }
      for (const correctLetter of correctLetters) {
        if (!answers.includes(correctLetter)) {
          canWin = false;
          break;
        }
      }
      if (canWin) {
        winners.push(connection);
      }
    }
    return [winners, result];
  }

  evaluateFreeTextQuiz(): [SIOConnection[], any] {
    const winners: SIOConnection[] = [];
    const result: TextResult = {
      items: [],
    };
    const correctAnswers = [];
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    /* Each answer field gets its own object */
    for (const choice of this.activeQuiz.choices) {
      const correctChoices = choice.options.filter((answer) => answer.correct);
      const correctWords = correctChoices.map((choice) => choice.label);
      correctAnswers.push(correctWords);
      result.items.push([]);
    }
    /* Aggregate Answers */
    for (const [connection, answers] of this.answers) {
      let canWin = true;
      /* for each text field count each given answer */
      for (let index = 0; index < this.activeQuiz.choices.length; index++) {
        const answer = answers[index];
        const item = result.items[index].find((item) => item.text === answer);
        if (item) {
          item.count++;
        } else {
          result.items[index].push({
            text: answer,
            count: 1,
          });
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
    const result: TextResult = {
      items: [],
    };
    const correctAnswers = [];
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    // Prepare the result array object
    for (const choice of this.activeQuiz.choices) {
      const picks: TextItem[] = [];
      for (const option of choice.options) {
        if (option.label) {
          picks.push({ text: option.label, count: 0 });
        }
      }
      const correctChoices = choice.options.filter((answer) => answer.correct);
      const correctLabels = correctChoices.map((answer) => answer.label);
      correctAnswers.push(correctLabels);
      result.items.push(picks);
    }
    for (const [connection, answers] of this.answers) {
      let canWin = true;
      for (let index = 0; index < answers.length; index++) {
        const answer = answers[index];
        const item = result.items[index].find((item) => item.text === answer);
        if (item) {
          item.count++;
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

  evaluateAssignmentQuiz(): [SIOConnection[], any] {
    let winners: SIOConnection[] = [];
    let result: AssignmentResult = {
      assignments: [],
    };
    if (!this.activeQuiz) {
      return [[], undefined];
    }
    /* An Assignment Quiz has only one choice entry */
    const choices = this.activeQuiz.choices[0].options;
    const categories = this.activeQuiz.choices[0].categories;

    const answers = [];

    /* Each choice represents an assignable object and its reason is the "correct" category */
    for (const choice of choices) {
      for (const category of categories) {
        result.assignments.push({
          letter: choice.letter,
          number: category.number,
          correct: choice.reason === category.number,
          count: 0,
        });
      }
      result.assignments.push({
        letter: choice.letter,
        number: 0,
        correct: choice.reason === 0,
        count: 0,
      });
    }

    /* Each answer represents an assignment: "object:category" */
    for (const [connection, answers] of this.answers) {
      let canWin = true;
      for (const answer of answers) {
        const [letter, numberString] = answer.split(":");
        const number = parseInt(numberString);
        const assignment = result.assignments.find(
          (assignment) =>
            assignment.letter === letter && assignment.number === number
        );
        if (assignment) {
          assignment.count++;
          if (!assignment.correct) {
            canWin = false;
          }
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
    this.mostRecentInteraction = Date.now();
    let winners: SIOConnection[] = [];
    let result: any = undefined;
    if (this.activeQuiz.type === "choice") {
      [winners, result] = this.evaluateChoiceQuiz();
    } else if (this.activeQuiz.type === "freetext") {
      [winners, result] = this.evaluateFreeTextQuiz();
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
    this.sendResults(result);
    // Reset internal state
    this.activeQuiz = undefined;
    for (const connection of this.connections) {
      connection.resetAnswers();
    }
  }
}
