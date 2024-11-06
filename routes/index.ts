import { NextFunction, Request, Response, Router } from "express";
import Session, {
  get as getSession,
  register as registerSession,
} from "../session";

import crypto from "crypto";
import cors from "cors";

const router: Router = Router();

function randomString(length: number): string {
  const hash = crypto
    .createHash("sha256")
    .update((+new Date()).toString(36))
    .digest("hex")
    .slice(-length);
  return hash;
}

/* GET home page. */
router.get("/", function (req: Request, res: Response, next: NextFunction) {
  return res.render("sio", { title: "Quizzer" });
});

router.get("/sio", function (req: Request, res: Response, next: NextFunction) {
  return res.render("sio", { title: "Quizzer" });
});

router.get("/test", function (req: Request, res: Response, next: NextFunction) {
  return res.render("test", { title: "Quizzer" });
});

router.get(
  "/client",
  function (req: Request, res: Response, next: NextFunction) {
    return res.render("sio", { title: "Quizzer Client" });
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
    const secret = randomString(8);
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
