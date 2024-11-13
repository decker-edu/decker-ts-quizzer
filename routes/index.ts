import { NextFunction, Request, Response, Router } from "express";
import Session, {
  get as getSession,
  register as registerSession,
} from "../session";

import crypto from "crypto";
import cors from "cors";

const router: Router = Router();

function randomString(
  length: number,
  characters: string = "abcdefghijklmnopqrstuvwxyz"
) {
  let result = "";
  let options = characters ? characters : "abcdefghijklmnopqrstuvwxyz";
  let amount = options.length;
  for (let i = 0; i < length; i++) {
    result += options.charAt(Math.floor(Math.random() * amount));
  }
  return result;
}

function randomSecret(length: number): string {
  const hash = crypto
    .createHash("sha256")
    .update((+new Date()).toString(36))
    .digest("hex")
    .slice(-length);
  return hash;
}

const base = "/";

/* GET home page. */
router.get("/", function (req: Request, res: Response, next: NextFunction) {
  const xpath = req.headers["x-path"];
  return res.render("sio", {
    title: "Quizzer Client",
    base: xpath ? xpath : base,
  });
});

router.get(
  "/([a-z]|[0-9]){4}",
  function (req: Request, res: Response, next: NextFunction) {
    const xpath = req.headers["x-path"];
    return res.render("sio", {
      title: "Quizzer Client",
      base: xpath ? xpath : base,
    });
  }
);

router.get(
  "/internal",
  function (req: Request, res: Response, next: NextFunction) {
    const xpath = req.headers["x-path"];
    return res.render("test", { title: "Quizzer", base: xpath ? xpath : base });
  }
);

router.post(
  "/api/session",
  cors(),
  function (req: Request, res: Response, next: NextFunction) {
    let id = randomString(4);
    while (getSession(id)) {
      id = randomString(4);
    }
    const secret = randomSecret(8);
    const session = new Session(id, secret);
    registerSession(id, session);
    return res.status(200).json({ id: id, secret: secret }).end();
  }
);

router.post(
  "/api/session/:session/question",
  function (req: Request, res: Response, next: NextFunction) {
    const secret = req.body.secret;
    const id = req.params.session;
    const session = getSession(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found." }).end();
    }
    if (session.secret !== secret) {
      return res.status(403).json({ message: "Invalid secret." }).end();
    }
    const quiz = req.body.quiz;
    session.setQuiz(quiz);
    return res.status(200).json({ message: "Question Received." }).end();
  }
);

export default router;
