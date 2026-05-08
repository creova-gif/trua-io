import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import campaignsRouter from "./campaigns";
import emailsRouter from "./emails";
import analyticsRouter from "./analytics";
import templatesRouter from "./templates";
import orgRouter from "./org";
import anthropicRouter from "./anthropic";
import teamRouter from "./team";
import complianceRouter from "./compliance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactsRouter);
router.use(campaignsRouter);
router.use(emailsRouter);
router.use(analyticsRouter);
router.use(templatesRouter);
router.use(orgRouter);
router.use(teamRouter);
router.use(complianceRouter);
router.use(anthropicRouter);

export default router;
