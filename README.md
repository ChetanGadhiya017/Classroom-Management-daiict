<div align="center">

# 🏫 Classroom Manager

**A lightweight web app for running a class: timetable, assignments, attendance and announcements in one place.**

Built as a team project at DA-IICT with Node.js, Express and MongoDB, plus a plain HTML/CSS/JS frontend.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JavaScript](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-F7DF1E?logo=javascript&logoColor=black)

</div>

---

## 🎬 Demo

https://github.com/user-attachments/assets/cfea0d2c-6451-430b-a9fe-d845aa8e690d

Full-quality recordings are in [`videoFile/`](videoFile).

---

## ✨ Features

- 🗓️ **Teacher timetable** view
- 📚 **Classes**: create classrooms and open each one's page
- 📝 **Assignments**: post assignments to a class
- ✅ **Attendance** records per student
- 🔔 **Notifications** and announcements feed
- 👩‍🎓 **Student** records

---

## 🧰 Tech stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (`fetch`) |
| Backend | Node.js, Express 4, CORS |
| Database | MongoDB with Mongoose schemas: `Classroom`, `Student`, `Assignment`, `Attendence`, `Notification` |

---

## 🚀 Getting started

```bash
git clone https://github.com/ChetanGadhiya017/Classroom-Management-daiict.git
cd Classroom-Management-daiict/backend
npm install
cp .env.example .env      # set MONGODB_URI (local MongoDB or Atlas)
npm run dev               # API on http://localhost:8000
```

Then open `frontend/index.html` in your browser (or serve the folder with any static server, e.g. VS Code Live Server).

---

## 📡 API

| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/class` | List / create classrooms |
| GET | `/:class` | Data for one classroom |
| GET / POST | `/students` | List / add students |
| GET / POST | `/assignment` | List / create assignments |
| GET / POST | `/attendence` | List / record attendance |
| GET / POST | `/notifications` | List / post notifications |

---

## 🗂️ Structure

```
├── backend/
│   ├── src/index.js        # Express app + routes
│   ├── src/schema/         # Mongoose models
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── styles.css
└── videoFile/              # demo recordings
```

---

## 🔮 Ideas for next steps

- Authentication with teacher / student roles
- Edit and delete endpoints, plus input validation
- Assignment file uploads and submissions
- Deploy the API and serve the frontend from Express
