import express from "express"
import authRoute from "./auth.js"
const shipperRoute = express.Router();

shipperRoute.use('/auth', authRoute)


export default shipperRoute
