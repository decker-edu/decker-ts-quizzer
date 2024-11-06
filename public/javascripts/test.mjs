import { addHostMessage } from "./host.mjs";

export let testSession = {
  id: undefined,
  secret: undefined,
};

export const testAssignQuiz = {
  type: "assignment",
  choices: [
    {
      votes: 1,
      categories: [
        {
          number: 1,
        },
        {
          number: 2,
        },
        {
          number: 3,
        },
      ],
      options: [
        {
          label: "Object A",
          letter: "A",
          reason: "Category A",
          correct: false,
        },
        {
          label: "Object B",
          letter: "B",
          reason: "Category B",
          correct: false,
        },
        {
          label: "Object C1",
          letter: "C",
          reason: "Category C",
          correct: false,
        },
        {
          label: "Object C2",
          letter: "D",
          reason: "Category C",
          correct: false,
        },
      ],
    },
  ],
};

export const testSelectQuiz = {
  type: "selection",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "Correct A1",
          letter: "A",
          reason: "Correct",
          correct: true,
        },
        {
          label: "Incorrect B1",
          letter: "B",
          reason: "Explanation B1",
          correct: false,
        },
        {
          label: "Incorrect C1",
          letter: "C",
          reason: "Explanation C1",
          correct: false,
        },
        {
          label: "Incorrect D1",
          letter: "D",
          reason: "Explanation D1",
          correct: false,
        },
      ],
    },
    {
      votes: 1,
      options: [
        {
          label: "Correct A2",
          letter: "A",
          reason: "Correct",
          correct: true,
        },
        {
          label: "Incorrect B2",
          letter: "B",
          reason: "Explanation B2",
          correct: false,
        },
        {
          label: "Incorrect C2",
          letter: "C",
          reason: "Explanation C2",
          correct: false,
        },
        {
          label: "Incorrect D2",
          letter: "D",
          reason: "Explanation D2",
          correct: false,
        },
      ],
    },
  ],
};

export const testTextQuiz = {
  type: "freetext",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "Correct A1",
          letter: "A",
          reason: "Correct",
          correct: true,
        },
        {
          label: "Incorrect B1",
          letter: "B",
          reason: "Explanation B1",
          correct: false,
        },
        {
          label: "Incorrect C1",
          letter: "C",
          reason: "Explanation C1",
          correct: false,
        },
        {
          label: "Incorrect D1",
          letter: "D",
          reason: "Explanation D1",
          correct: false,
        },
      ],
    },
    {
      votes: 1,
      options: [
        {
          label: "Correct A2",
          letter: "A",
          reason: "Correct",
          correct: true,
        },
        {
          label: "Incorrect B2",
          letter: "B",
          reason: "Explanation B2",
          correct: false,
        },
        {
          label: "Incorrect C2",
          letter: "C",
          reason: "Explanation C2",
          correct: false,
        },
        {
          label: "Incorrect D2",
          letter: "D",
          reason: "Explanation D2",
          correct: false,
        },
      ],
    },
  ],
};

export const testChoiceQuiz = {
  type: "choice",
  choices: [
    {
      votes: 1,
      options: [
        {
          label: "Correct A1",
          letter: "A",
          reason: "Correct",
          correct: true,
        },
        {
          label: "Incorrect B1",
          letter: "B",
          reason: "Explanation B1",
          correct: false,
        },
        {
          label: "Incorrect C1",
          letter: "C",
          reason: "Explanation C1",
          correct: false,
        },
        {
          label: "Incorrect D1",
          letter: "D",
          reason: "Explanation D1",
          correct: false,
        },
      ],
    },
  ],
};

export async function createTestSession() {
  try {
    const response = await fetch(`./api/session`, {
      method: "POST",
    });
    const json = await response.json();
    addHostMessage(`[API] id: ${json.id} secret: ${json.secret}`);
    testSession.id = json.id;
    testSession.secret = json.secret;
  } catch (error) {
    console.error(error);
    addHostMessage("[API] Error");
    throw error;
  }
}
