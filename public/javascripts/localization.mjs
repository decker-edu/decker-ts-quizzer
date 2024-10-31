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
  unassigned: "Keine Zuweisung",
};

const english = {
  choicesLabel: "You have {0} choice(s).",
  sessionInput: "Session ID",
  sessionLabel: "Session: {0}",
  connectLabel: "Connect",
  submitLabel: "Submit",
  selectionPlaceholder: "Choose ...",
  unassigned: "Unassigned",
};
