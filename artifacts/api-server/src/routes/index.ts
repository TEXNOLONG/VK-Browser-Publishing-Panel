import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./vk-auth";
import publishingRouter from "./vk-publishing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publishingRouter);

export default router;
