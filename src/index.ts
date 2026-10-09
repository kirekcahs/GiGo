import "dotenv/config";
import express from "express";
import router from "@/routes/indexRoutes.js";
import connectDB from "./config/db.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json());

app.use("/api", router);

app.listen(PORT, () => console.log(`Server running in port ${PORT}`));
