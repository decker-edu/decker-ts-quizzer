import { sendAnswers } from "./sio-client.mjs";

let selectedAnswer = undefined;
let draggedAnswer = null;
let dropTarget = null;

function handleDrop(event) {
  event.preventDefault();
  if (draggedAnswer && dropTarget) {
    dropTarget.appendChild(draggedAnswer);
  }
  draggedAnswer = null;
  dropTarget = null;
  return false;
}

export default class Renderer {
  static renderAssignmentQuiz(parent, quiz) {
    const container = document.createElement("div");
    container.classList.add("assignment-quiz");
    const questionParagraph = document.createElement("p");
    container.appendChild(questionParagraph);
    questionParagraph.innerText = quiz.question;
    if (quiz.choices.length !== 1) {
      questionParagraph.innerText =
        "Assignment Quiz only supports a single choice.";
    }
    const choices = quiz.choices[0];
    const categories = [];

    const answerArea = document.createElement("div");

    const answerBucket = document.createElement("button");
    answerBucket.classList.add("answer-bucket");
    answerBucket.classList.add("category");
    const answerItems = document.createElement("div");
    answerItems.classList.add("items");
    answerBucket.appendChild(answerItems);
    const answerLabel = document.createElement("span");
    answerLabel.innerText = "Answers";
    answerBucket.appendChild(answerLabel);
    answerBucket.addEventListener("click", (event) => {
      if (selectedAnswer) {
        answerItems.appendChild(selectedAnswer);
        selectedAnswer.classList.remove("selected");
        selectedAnswer = null;
      }
      event.stopPropagation();
    });

    let enterCounter = 0;

    function dragenter(event) {
      if (enterCounter === 0) {
        answerBucket.classList.add("dragover");
        dropTarget = answerItems;
      }
      enterCounter++;
      event.preventDefault();
    }

    function dragleave(event) {
      enterCounter--;
      if (enterCounter === 0) {
        answerBucket.classList.remove("dragover");
        dropTarget = null;
      }
    }

    function dragover(event) {
      event.preventDefault();
    }

    function drop(event) {
      enterCounter = 0;
      answerBucket.classList.remove("dragover");
    }

    const parts = [answerBucket, answerLabel, answerItems];

    for (const part of parts) {
      part.addEventListener("dragover", dragover);
      part.addEventListener("dragenter", dragenter);
      part.addEventListener("dragleave", dragleave);
      part.addEventListener("drop", handleDrop);
      part.addEventListener("drop", drop);
    }
    answerArea.appendChild(answerBucket);
    container.appendChild(answerArea);

    const answers = [];

    for (const answer of choices.options) {
      if (answer.reason) {
        categories.push(answer.reason);
      }
      const button = document.createElement("button");
      const label = document.createElement("span");
      label.innerText = answer.letter ? answer.letter : answer.label;
      button.appendChild(label);
      button.classList.add("answer");
      button.draggable = true;
      button.dataset["label"] = answer.label;

      button.addEventListener("click", (event) => {
        if (selectedAnswer === button) {
          selectedAnswer = null;
          button.classList.remove("selected");
        } else {
          if (selectedAnswer) {
            selectedAnswer.classList.remove("selected");
          }
          selectedAnswer = button;
          button.classList.add("selected");
        }
        event.stopPropagation();
      });

      button.addEventListener("dragstart", (event) => {
        draggedAnswer = event.target;
      });

      button.addEventListener("dragend", (event) => {
        draggedAnswer = null;
      });

      answerItems.appendChild(button);
      answers.push(button);
    }
    const uniqueCategories = categories.filter(
      (value, index, array) => array.indexOf(value) === index
    );

    const categoryArea = document.createElement("div");
    categoryArea.classList.add("categories");
    container.appendChild(categoryArea);

    const areas = [];
    for (const category of uniqueCategories) {
      if (!category) {
        continue;
      }
      const area = document.createElement("button");
      const label = document.createElement("span");
      label.innerText = category;
      area.dataset["label"] = category;
      area.classList.add("category");
      area.appendChild(label);
      categoryArea.appendChild(area);
      const items = document.createElement("div");
      items.classList.add("items");
      area.appendChild(items);

      area.solution = category;

      area.addEventListener("click", (event) => {
        if (selectedAnswer) {
          items.appendChild(selectedAnswer);
          selectedAnswer.classList.remove("selected");
          selectedAnswer = null;
        }
        event.stopPropagation();
      });

      let enterCounter = 0;

      function dragenter(event) {
        enterCounter++;
        if (enterCounter > 0) {
          area.classList.add("dragover");
          dropTarget = items;
        }
        event.preventDefault();
      }

      function dragleave(event) {
        enterCounter--;
        if (enterCounter === 0) {
          area.classList.remove("dragover");
          dropTarget = null;
        }
      }

      function dragover(event) {
        event.preventDefault();
      }

      function drop(event) {
        enterCounter = 0;
        area.classList.remove("dragover");
      }

      const parts = [area, label, items];

      for (const part of parts) {
        part.addEventListener("dragover", dragover);
        part.addEventListener("dragenter", dragenter);
        part.addEventListener("dragleave", dragleave);
        part.addEventListener("drop", handleDrop);
        part.addEventListener("drop", drop);
      }
      areas.push(area);
    }

    const submitContainer = document.createElement("div");
    submitContainer.classList.add("submit-container");

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.innerText = "Submit Choices";
    submitButton.onclick = () => {
      const result = [];
      const assignemnt = {};
      for (const answer of answers) {
        const category = answer.closest(".category").dataset["label"];
        const label = answer.dataset["label"];
        if (category) {
          assignemnt[label] = category;
        } else {
          assignemnt[label] = "None";
        }
        answer.disabled = true;
      }
      for (const area of areas) {
        area.disabled = true;
      }
      answerBucket.disabled = true;
      result.push(assignemnt);
      sendAnswers(result);
    };
    submitContainer.appendChild(submitButton);
    container.appendChild(submitContainer);
    parent.appendChild(container);
  }

  static renderSelectQuiz(parent, quiz) {
    const container = document.createElement("div");
    container.classList.add("selection-quiz");
    const split = quiz.question.split(/(\[#[0-9]+\])/g);
    console.log(split);
    const paragraph = document.createElement("p");
    const inputContainer = document.createElement("div");
    const submitContainer = document.createElement("div");
    inputContainer.classList.add("answer-container");
    submitContainer.classList.add("submit-container");
    const selections = [];
    let boxNumber = 0;
    for (const token of split) {
      if (token === "") {
        continue;
      }
      if (/\[#[0-9]+\]/.test(token)) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("select-wrapper");
        const selection = document.createElement("select");
        wrapper.appendChild(selection);
        selection.placeholder = "Pick One";
        selections.push(selection);
        const options = quiz.choices[boxNumber++].options;
        for (const option of options) {
          const item = document.createElement("option");
          item.innerText = option.label;
          selection.appendChild(item);
        }
        paragraph.appendChild(wrapper);
      } else {
        const span = document.createElement("span");
        span.innerText = token;
        paragraph.appendChild(span);
      }
    }
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.innerText = "Submit Answer(s)";
    submitButton.onclick = () => {
      const answers = [];
      submitButton.disabled = true;
      for (const input of selections) {
        answers.push(input.value);
        input.disabled = true;
      }
      sendAnswers(answers);
    };
    submitContainer.appendChild(submitButton);
    container.appendChild(paragraph);
    container.appendChild(submitContainer);
    parent.appendChild(container);
  }

  static renderTextQuiz(parent, quiz) {
    const container = document.createElement("div");
    container.classList.add("text-quiz");
    const split = quiz.question.split(/(\[#[0-9]+\])/g);
    console.log(split);
    const paragraph = document.createElement("p");
    const inputContainer = document.createElement("div");
    const submitContainer = document.createElement("div");
    inputContainer.classList.add("answer-container");
    submitContainer.classList.add("submit-container");
    const replacers = [];
    let placeholderNumber = 1;
    for (const token of split) {
      if (token === "") {
        continue;
      }
      if (/\[#[0-9]+\]/.test(token)) {
        const replacer = document.createElement("input");
        replacer.type = "text";
        replacer.placeholder = "Placeholder #" + placeholderNumber++;
        const span = document.createElement("span");
        span.innerText = `[${replacer.placeholder}]`;
        replacer.addEventListener("keyup", (event) => {
          if (replacer.value !== "") {
            span.innerText = replacer.value;
          } else {
            span.innerText = `[${replacer.placeholder}]`;
          }
        });
        replacers.push(replacer);
        inputContainer.appendChild(replacer);
        paragraph.appendChild(span);
      } else {
        const span = document.createElement("span");
        span.innerText = token;
        paragraph.appendChild(span);
      }
    }
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.innerText = "Submit Answer(s)";
    submitButton.onclick = () => {
      const answers = [];
      for (const input of replacers) {
        answers.push(input.value);
        input.disabled = true;
      }
      sendAnswers(answers);
    };
    submitContainer.appendChild(submitButton);
    container.appendChild(paragraph);
    container.appendChild(inputContainer);
    container.appendChild(submitContainer);
    parent.appendChild(container);
  }

  static renderChoiceQuiz(parent, quiz) {
    const container = document.createElement("div");
    container.classList.add("choice-quiz");
    const answerContainer = document.createElement("div");
    answerContainer.classList.add("answer-container");
    const submitContainer = document.createElement("div");
    submitContainer.classList.add("submit-container");
    const questionParagraph = document.createElement("p");
    questionParagraph.innerHTML = quiz.question;
    container.appendChild(questionParagraph);
    if (quiz.choices.length > 1) {
      const error = document.createElement("p");
      error.innerText =
        "Malformed Quiz Data: Multiple answer sets for a multiple choice quiz.";
      return;
    }
    const answers = quiz.choices[0];
    const votes = answers.votes;
    const votesParagraph = document.createElement("p");
    votesParagraph.innerHTML = `You can select ${votes} choice(s)`;
    container.appendChild(votesParagraph);
    let selected = 0;
    const answerButtons = [];
    for (const answer of answers.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("answer");
      button.dataset["answer"] = answer.label;
      button.addEventListener("click", (event) => {
        const pressed = button.ariaPressed;
        if (!pressed || pressed === "false") {
          button.ariaPressed = "true";
          selected++;
          if (selected >= votes) {
            for (const other of answerButtons) {
              const otherPressed = other.ariaPressed;
              if (!otherPressed || otherPressed === "false") {
                other.disabled = true;
              }
            }
          }
        } else if (pressed === "true") {
          button.ariaPressed = "false";
          selected--;
          for (const other of answerButtons) {
            other.disabled = false;
          }
        }
      });
      if (answer.letter) {
        button.innerHTML = answer.letter;
      } else {
        button.innerHTML = answer.label;
      }
      answerContainer.appendChild(button);
      answerButtons.push(button);
    }
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.innerText = "Submit Answer(s)";
    submitButton.onclick = () => {
      submitButton.disabled = true;
      const answers = [];
      for (const button of answerButtons) {
        if (button.ariaPressed === "true") {
          answers.push(button.dataset["answer"]);
        }
        button.disabled = true;
      }
      sendAnswers(answers);
    };
    submitContainer.appendChild(submitButton);
    container.appendChild(answerContainer);
    container.appendChild(submitContainer);
    parent.appendChild(container);
  }
}
