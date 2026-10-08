require("dotenv").config();
const mongoose = require("mongoose");
const Assignment = require("./schema/assignment");
const Notification = require("./schema/notification");
const Student = require("./schema/student");
const Attendence = require("./schema/attendence");
const Classroom = require("./schema/classroom");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());

app.use(cors());
app.options("*", cors());
mongoose
  // Connection string comes from backend/.env (see .env.example)
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classroom")
  .then(() => {
    console.log("Connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/class", async (req, res) => {
  const classData = await Classroom.find();
  res.json(classData);
});

app.post("/class", async (req, res) => {
  const classData = new Classroom(req.body);
  classData.save();
  res.json(classData);
});

app.get("/notifications", async (req, res) => {
  const notifications = await Notification.find();
  res.json(notifications);
});

app.post("/notifications", async (req, res) => {
  const notifications = new Notification(req.body);
  notifications.save();
  res.json(notifications);
});

app.get("/students", async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

app.post("/students", async (req, res) => {
  const students = new Student(req.body);
  students.save();
  res.json(students);
});

app.get("/attendence", async (req, res) => {
  const attendence = await Attendence.find();
  res.json(attendence);
});

app.post("/attendence", async (req, res) => {
  const attendence = new Attendence(req.body);
  attendence.save();
  res.json(attendence);
});

app.get("/assignment", async (req, res) => {
  const assignment = await Assignment.find();
  res.json(assignment);
});

app.post("/assignment", async (req, res) => {
  const assignment = new Assignment(req.body);
  assignment.save();
  res.json(assignment);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`We are listening on Port:${PORT} ...`);
});

app.get("/:class", async (req, res) => {
  const aggregateData = await Classroom.aggregate([
    {
      $match: { name: req.params.class },
    },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "class_id",
        as: "students",
      },
    },
    {
      $lookup: {
        from: "assignments",
        localField: "_id",
        foreignField: "class_id",
        as: "assignments",
      },
    },
    {
      $lookup: {
        from: "attendances",
        localField: "_id",
        foreignField: "class_id",
        as: "attendences",
      },
    },
    {
      $lookup: {
        from: "notifications",
        localField: "_id",
        foreignField: "class_id",
        as: "notifications",
      },
    },
  ]);
  res.json(aggregateData);
});

app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      error: "Not Found",
      message: err.message,
    },
  });
});