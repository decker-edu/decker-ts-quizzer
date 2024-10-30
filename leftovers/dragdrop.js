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
