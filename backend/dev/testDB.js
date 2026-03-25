import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../models/Session.js";

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected (test)");

  const session = await Session.create({
    constraints: {},
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  console.log("Session created:", session._id);

  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});