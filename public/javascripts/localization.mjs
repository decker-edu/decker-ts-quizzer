export default function (lang) {
  if (lang === "de") {
    return german;
  } else {
    return english;
  }
}

const german = {
  choicesLabel: "Du kannst {0} Antwort(en) auswählen.",
  sessionInput: "Sitzungs ID",
  sessionLabel: "Sitzung: {0}",
  connectLabel: "Beitreten",
  submitLabel: "Absenden",
  selectionPlaceholder: "Auswählen ...",
  textPlaceholder: "Antwort #{0} ...",
  unassigned: "Keine Zuweisung",
  choiceQuiz: "Multiple-Choice-Quiz",
  freetextQuiz: "Freitext-Quiz",
  selectionQuiz: "Auswahl-Quiz",
  assignmentQuiz: "Zuweisungs-Quiz",
  share: "Teilen",
};

const english = {
  choicesLabel: "You have {0} choice(s).",
  sessionInput: "Session ID",
  sessionLabel: "Session: {0}",
  connectLabel: "Connect",
  submitLabel: "Submit",
  selectionPlaceholder: "Choose ...",
  textPlaceholder: "Answer #{0} ...",
  unassigned: "Unassigned",
  choiceQuiz: "Multiple-Choice Quiz",
  freetextQuiz: "Free Text Quiz",
  selectionQuiz: "Selection Quiz",
  assignmentQuiz: "Assignment Quiz",
  share: "Share",
};
