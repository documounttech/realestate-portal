# 🏠 Real Estate Portal

![Node.js](https://img.shields.io/badge/Backend-Node.js-brightgreen)
![Express](https://img.shields.io/badge/Framework-Express-blue)
![Bootstrap](https://img.shields.io/badge/Frontend-Bootstrap_5-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-MVP_Complete-success)

---

## 🌟 Overview

**Real Estate Portal** is a modern web application for listing, buying, and renting properties.Built using **Node.js**, **Express**, **EJS**, and **Bootstrap 5**, it allows both users and administrators to manage real estate listings efficiently — with Excel import, image uploads, and a clean responsive design.

> 💡 This project stores data locally in JSON files, making it lightweight and portable for MVP or demo deployments.

---

## 🧩 Features

### 👤 User Features

- Register and log in securely (hashed passwords)
- Add, edit, and delete your own property listings
- Upload multiple property images (via Multer)
- Dashboard to view and manage your listings
- Filter listings by **city** and **listing type (Buy / Rent)**
- View property details with a full-screen image carousel

### 🧑‍💼 Admin Features

- Admin login and protected dashboard
- View, delete, or import properties from Excel files
- Bulk import properties using `.xlsx` templates
- Simple credentials (`admin / 1234`) for demo use

### 📰 General Features

- Home page with auto-scrolling hero banner (3 slides)
- Embedded **location and type filter form** inside the hero
- Responsive and mobile-friendly UI
- Additional pages: **About, Contact, Blog, Privacy, Terms**
- Custom **404 Page** and **Property Not Found Page**

---

## 🏗️ Tech Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| Backend        | Node.js + Express              |
| Frontend       | EJS Templates + Bootstrap 5    |
| Data Storage   | JSON Files (portable database) |
| File Uploads   | Multer                         |
| Excel Import   | XLSX (SheetJS)                 |
| Authentication | express-session + bcryptjs     |
| UUIDs          | uuid                           |

---

## 📂 Project Structure

realestate-portal/

│

├── server.js                # Main Express server

├── package.json

├── .gitignore

├── README.md

│

├── data/                    # JSON files for users, properties, blogs

│   ├── users.json

│   ├── properties.json

│   └── blogs.json

│

├── public/

│   ├── css/

│   │   └── styles.css

│   ├── images/

│   │   ├── hero1.jpg

│   │   ├── hero2.jpg

│   │   └── hero3.jpg

│   └── uploads/             # User-uploaded property images

│

└── views/                   # EJS templates

├── layout.ejs

├── index.ejs

├── add-property.ejs

├── property-details.ejs

├── dashboard.ejs

├── admin-login.ejs

├── admin-dashboard.ejs

├── admin-import.ejs

├── about.ejs

├── contact.ejs

├── 404.ejs

└── ...

Admin Access

| Username  | Password |
| --------- | -------- |
| `admin` | `1234` |

---

## 🚀 Setup & Run Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/<yourusername>/realestate-portal.git
cd realestate-portal
---


## ⚙️ Configuration

You can modify:

* `PORT` → In `server.js` (default 3000)
* `data/` → for initial JSON data
* `/public/css/styles.css` → for branding & colors

---

## 🧾 License

This project is licensed under the **MIT License** — free for personal and commercial use.

© 2025 **Sailu Miltry**

---

## 💬 Contact


**Sailu Miltry**
📧 sailu@documounttech.in

🌐 [LinkedIn](https://linkedin.com/in/venugopal)

🏢 Documount Technologies Pvt Ltd
```
