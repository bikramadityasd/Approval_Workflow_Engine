import "dotenv/config";
import express from "express";
import userRoutes from "./routes/userRoutes.js";
import requestRoute from "./routes/requestRoutes.js";


const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/users", userRoutes);
app.use("/requests", requestRoute);


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server in ${PORT}`);
});
