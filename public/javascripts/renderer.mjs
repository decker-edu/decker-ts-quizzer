import { sendAnswers } from "./sio-client.mjs";
import localization from "./localization.mjs";

const l10n = localization(navigator.language);

function createContainer() {
  const container = document.createElement("div");
  container.className = "quizzer-container";
  const answerArea = document.createElement("div");
  answerArea.className = "answer-area";
  const submitArea = document.createElement("div");
  submitArea.className = "submit-area";
  const submitButton = document.createElement("button");
  submitButton.type = "button";
  submitButton.innerHTML = l10n.submitLabel;
  submitButton.title = l10n.submitLabel;
  submitButton.ariaLabel = l10n.submitLabel;
  submitButton.className = "submit-button";
  submitArea.appendChild(submitButton);
  container.appendChild(answerArea);
  container.appendChild(submitArea);
  container.answerArea = answerArea;
  container.submitArea = submitArea;
  container.submitButton = submitButton;
  return container;
}
export default class Renderer {
  static renderAssignmentQuiz(parent, quiz) {
    const container = createContainer();
    container.classList.add("assignment-quiz");
    const choice = quiz.choices[0];
    const options = choice.options;
    const categories = choice.categories;

    const boxes = [];
    for (const option of options) {
      const block = document.createElement("div");
      block.className = "assignment-block";
      const letter = document.createElement("p");
      letter.innerHTML = option.letter;
      const wrapper = document.createElement("div");
      wrapper.className = "select-wrapper";
      const select = document.createElement("select");
      const defaultOption = document.createElement("option");
      defaultOption.selected = true;
      defaultOption.value = 0;
      defaultOption.text = l10n.unassigned;
      select.appendChild(defaultOption);
      for (const category of categories) {
        const option = document.createElement("option");
        option.value = category.number;
        option.text = category.number;
        select.appendChild(option);
      }
      select.letter = option.letter;
      const arrow = document.createElement("span");
      arrow.className = "fa-solid fa-arrow-right";
      wrapper.appendChild(select);
      block.appendChild(letter);
      block.appendChild(arrow);
      block.appendChild(wrapper);
      boxes.push(select);
      container.answerArea.appendChild(block);
    }

    container.submitButton.addEventListener("click", () => {
      const answers = [];
      for (const box of boxes) {
        const letter = box.letter;
        const number = box.value;
        const answer = `${letter}:${number}`;
        answers.push(answer);
        box.disabled = true;
      }
      container.submitButton.disabled = true;
      sendAnswers(answers);
    });
    parent.appendChild(container);
  }

  static renderSelectQuiz(parent, quiz) {
    const container = createContainer();
    container.classList.add("selection-quiz");
    const selections = [];
    for (const choice of quiz.choices) {
      const wrapper = document.createElement("div");
      wrapper.classList.add("select-wrapper");
      const select = document.createElement("select");
      wrapper.appendChild(select);
      const placeholder = document.createElement("option");
      placeholder.selected = true;
      placeholder.disabled = true;
      placeholder.value = "__ERROR__";
      placeholder.text = l10n.selectionPlaceholder;
      select.appendChild(placeholder);
      for (const option of choice.options) {
        const element = document.createElement("option");
        element.value = option.label;
        element.text = option.label;
        select.appendChild(element);
      }
      selections.push(select);
      container.answerArea.appendChild(wrapper);
    }
    container.submitButton.addEventListener("click", () => {
      for (const input of selections) {
        if (input.value === "__ERROR__") {
          input.focus();
          return;
        }
      }
      const answers = [];
      container.submitButton.disabled = true;
      for (const input of selections) {
        answers.push(input.value);
        input.disabled = true;
      }
      sendAnswers(answers);
    });
    parent.appendChild(container);
  }

  static renderTextQuiz(parent, quiz) {
    const container = createContainer();
    container.classList.add("text-quiz");
    const inputs = [];
    for (const _ of quiz.choices) {
      const input = document.createElement("input");
      input.type = "text";
      container.answerArea.appendChild(input);
      inputs.push(input);
    }
    container.submitButton.addEventListener("click", () => {
      const answers = [];
      for (const input of inputs) {
        answers.push(input.value);
        input.disabled = true;
      }
      container.submitButton.disabled = true;
      sendAnswers(answers);
    });
    parent.appendChild(container);
  }

  static renderChoiceQuiz(parent, quiz) {
    const container = createContainer();
    container.classList.add("choice-quiz");
    const choice = quiz.choices[0];
    const votes = choice.votes;
    /*
    const votesParagraph = document.createElement("p");
    votesParagraph.innerText = l10n.choicesLabel.replace(/\{0\}/g, votes);
    container.answerArea.appendChild(votesParagraph);
    */
    let selected = 0;
    const answerButtons = [];
    for (const option of choice.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("answer");
      button.dataset["letter"] = option.letter;
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
      button.innerHTML = option.letter;
      container.answerArea.appendChild(button);
      answerButtons.push(button);
    }
    container.submitButton.addEventListener("click", () => {
      container.submitButton.disabled = true;
      const answers = [];
      for (const button of answerButtons) {
        if (button.ariaPressed === "true") {
          answers.push(button.dataset["letter"]);
        }
        button.disabled = true;
      }
      console.log(answers);
      sendAnswers(answers);
    });
    parent.appendChild(container);
  }
}
