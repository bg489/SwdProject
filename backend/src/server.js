import dotenv from "dotenv";
import sequelize from "./config/db.js";
import app from "./app.js";
import { verifyMailer } from "./config/mailer.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    try {
      const mailReady = await verifyMailer();
      if (mailReady) {
        console.log("Mailer connected successfully");
      }
    } catch (mailError) {
      console.error("Mailer verification failed:", mailError.message);
      console.log("Server will continue without email delivery");
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
};

startServer();