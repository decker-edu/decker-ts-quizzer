import { addHostMessage } from "./host.mjs";
import config from "./config.mjs";

export let testSession = {
  id: undefined,
  secret: undefined,
};

export const testAssignQuiz = {
  type: "assignment",
  question: "What is a man?",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "Secrets",
          reason: "A pile of",
          correct: false,
        },
        {
          label: "Enough",
          reason: "Talk",
          correct: false,
        },
        {
          label: "At you",
          reason: "Have",
          correct: false,
        },
      ],
    },
  ],
};

export const testSelectQuiz = {
  type: "selection",
  question: "[#1] is a man? A [#2] pile of secrets!",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "What",
          reason: "Correct",
          correct: true,
        },
        {
          label: "Why",
          reason: "No, that is the human condition.",
          correct: false,
        },
        {
          label: "When",
          reason: "Not right now.",
          correct: false,
        },
      ],
    },
    {
      votes: 1,
      options: [
        {
          label: "glorious",
          reason: "Not as incandessant as you think.",
          correct: false,
        },
        {
          label: "miserable",
          reason: "But enough talk!",
          correct: true,
        },
        {
          label: "xenophobic",
          reason: "Actually true, but no.",
          correct: false,
        },
      ],
    },
  ],
};

export const testTextQuiz = {
  type: "freetext",
  question:
    "[#1] is a man? A [#2] pile of secrets! But [#3] talk! Have at you[#4]",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "What",
          reason: "That is the question.",
          correct: true,
        },
      ],
    },
    {
      votes: 1,
      options: [
        {
          label: "miserable",
          reason: "The human condition.",
          correct: true,
        },
      ],
    },
    {
      votes: 1,
      options: [
        {
          label: "enough",
          reason: "Kenough",
          correct: true,
        },
      ],
    },
    {
      votes: 1,
      options: [
        {
          label: "!",
          reason: "Because Not",
          correct: true,
        },
      ],
    },
  ],
};

export const testChoiceQuiz = {
  type: "choice",
  question: "What is a man?",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "A miserable pile of secrets!",
          reason: "Die, monster! You do not belong in this world!",
          correct: true,
          chosen: 0,
        },
        {
          label: "Enough Talk!",
          reason: "Have at you!",
          correct: false,
          chosen: 0,
        },
      ],
    },
  ],
};

export async function createTestSession() {
  try {
    const response = await fetch(`${config.subroute}/api/session`, {
      method: "POST",
    });
    const json = await response.json();
    addHostMessage(`API: id: ${json.id} secret: ${json.secret}`);
    testSession.id = json.id;
    testSession.secret = json.secret;
  } catch (error) {
    console.error(error);
    addHostMessage("API: Error");
    throw error;
  }
}
