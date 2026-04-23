import "dotenv/config";
import express from "express";
import userRoutes from "./routes/userRoutes.js";
import requestRoute from "./routes/requestRoute.js";


const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/", userRoutes);
app.use("/", requestRoute)


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server in ${PORT}`);
});