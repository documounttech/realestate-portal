// server.js (ESM)

import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import expressLayouts from "express-ejs-layouts";
import session from "express-session";
import multer from "multer";
import path from "path";
import bcrypt from "bcryptjs";
import xlsx from "xlsx";

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- DATA FILES --------------------
const dataDir = "./data";
const userFile = path.join(dataDir, "users.json");
const propertyFile = path.join(dataDir, "properties.json");
const blogFile = path.join(dataDir, "blogs.json");

// Ensure data files exist with empty arrays
for (const f of [userFile, propertyFile, blogFile]) {
  if (!fs.existsSync(f)) fs.outputJSONSync(f, []);
}

// -------------------- APP SETUP --------------------
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "realestate_secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Make session available in all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// -------------------- UPLOADS (IMAGES + EXCEL) --------------------
// Ensure upload folders exist
const publicUploadsDir = "public/uploads";
const tempUploadsDir = "uploads";
fs.ensureDirSync(publicUploadsDir);
fs.ensureDirSync(tempUploadsDir);

// Multer storage for property images (saved in /public/uploads)
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, publicUploadsDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const uploadImages = multer({ storage: imageStorage });

// Multer storage for Excel (temp in /uploads)
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const uploadExcel = multer({ storage: excelStorage });

// -------------------- JSON HELPERS --------------------
const loadJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return [];
  }
};
const saveJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// =====================================================
//                      ROUTES
// =====================================================

// -------------------- AUTH (USER) --------------------
app.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const users = loadJSON(userFile);

  if (users.find((u) => u.email === email)) {
    return res.render("register", { error: "Email already registered", success: null });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  users.push({
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    date: new Date().toISOString(),
  });
  saveJSON(userFile, users);

  res.render("register", { success: "Registration successful! Please log in.", error: null });
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadJSON(userFile);
  const user = users.find((u) => u.email === email);

  if (!user) return res.render("login", { error: "User not found" });
  if (!bcrypt.compareSync(password, user.password))
    return res.render("login", { error: "Invalid password" });

  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const properties = loadJSON(propertyFile).filter((p) => p.userId === req.session.user.id);
  res.render("dashboard", { user: req.session.user, properties });
});

// -------------------- PROPERTY: ADD --------------------
app.get("/add", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("add-property");
});

// Supports multiple images (for carousel) – name="photos"
app.post("/add", uploadImages.array("photos", 6), (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const { title, type, price, location, description, listingType } = req.body;
  const photos = (req.files || []).map((f) => "/uploads/" + f.filename);
  const mainPhoto = photos[0] || "/images/property.jpg";

  const properties = loadJSON(propertyFile);
  properties.push({
    id: uuidv4(),
    title,
    type,
    price: Number(price),
    location,
    description,
    listingType: listingType || "Sale", // Sale | Rent
    photos,
    mainPhoto,
    userId: req.session.user.id,
    userName: req.session.user.name,
    date: new Date().toISOString(),
  });
  saveJSON(propertyFile, properties);

  res.redirect("/dashboard");
});

// -------------------- PROPERTY: EDIT --------------------
app.get("/edit/:id", (req, res) => {
  if (!req.session.user && !req.session.admin) return res.redirect("/login");

  const properties = loadJSON(propertyFile);
  const property = properties.find((p) => p.id === req.params.id);
  if (!property) return res.status(404).render("property-notfound");

  // Only owner or admin
  if (!req.session.admin && req.session.user.id !== property.userId) {
    return res.status(403).send("Unauthorized access");
  }

  res.render("edit-property", { property, success: null, error: null });
});

app.post("/edit/:id", uploadImages.array("photos", 6), (req, res) => {
  if (!req.session.user && !req.session.admin) return res.redirect("/login");

  const properties = loadJSON(propertyFile);
  const idx = properties.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).render("property-notfound");

  const current = properties[idx];

  // Only owner or admin
  if (!req.session.admin && req.session.user.id !== current.userId) {
    return res.status(403).send("Unauthorized access");
  }

  const { title, type, price, location, description, listingType } = req.body;

  // If new photos uploaded, replace
  let photos = current.photos || [];
  if (req.files && req.files.length > 0) {
    photos = req.files.map((f) => "/uploads/" + f.filename);
  }

  properties[idx] = {
    ...current,
    title,
    type,
    price: Number(price),
    location,
    description,
    listingType: listingType || current.listingType || "Sale",
    photos,
    mainPhoto: photos[0] || current.mainPhoto || "/images/property.jpg",
    dateModified: new Date().toISOString(),
  };

  saveJSON(propertyFile, properties);
  res.render("edit-property", {
    property: properties[idx],
    success: "Property updated successfully!",
    error: null,
  });
});

// -------------------- PROPERTY: DETAILS --------------------
app.get("/property/:id", (req, res) => {
  const properties = loadJSON(propertyFile);
  const property = properties.find((p) => p.id === req.params.id);
  if (!property) return res.status(404).render("property-notfound");
  res.render("property-details", { property });
});

// -------------------- HOME + FILTERS --------------------
app.get("/", (req, res) => {
  const properties = loadJSON(propertyFile);
  const blogs = loadJSON(blogFile);

  const cityFilter = (req.query.city || "").trim();
  const typeFilter = (req.query.listingType || "").trim().toLowerCase(); // "sale" | "rent" | ""

  let filtered = properties;
  if (cityFilter) {
    filtered = filtered.filter((p) =>
      (p.location || "").toLowerCase().includes(cityFilter.toLowerCase())
    );
  }
  if (typeFilter) {
    filtered = filtered.filter(
      (p) => (p.listingType || "Sale").toLowerCase() === typeFilter
    );
  }

  const uniqueCities = [...new Set(properties.map((p) => p.location).filter(Boolean))];

  res.render("index", {
    properties: filtered,
    uniqueCities,
    cityFilter,
    session: req.session,
    blogs,
  });
});

// Quick views for Buy/Rent pages
app.get("/buy", (req, res) => {
  const properties = loadJSON(propertyFile);
  const saleProps = properties.filter(
    (p) => (p.listingType || "Sale").toLowerCase() === "sale"
  );
  res.render("listings", { title: "Properties for Sale", properties: saleProps });
});

app.get("/rent", (req, res) => {
  const properties = loadJSON(propertyFile);
  const rentProps = properties.filter(
    (p) => (p.listingType || "").toLowerCase() === "rent"
  );
  res.render("listings", { title: "Properties for Rent", properties: rentProps });
});

// -------------------- BLOGS --------------------
app.get("/blogs", (req, res) => {
  const blogs = loadJSON(blogFile);
  res.render("blogs", { blogs });
});
app.get("/blog/:id", (req, res) => {
  const blogs = loadJSON(blogFile);
  const blog = blogs.find((b) => b.id === req.params.id);
  if (!blog) return res.status(404).send("Blog not found");
  res.render("blog-details", { blog });
});

// -------------------- ADMIN --------------------
app.get("/admin/login", (req, res) => res.render("admin-login", { error: null }));
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "1234") {
    req.session.admin = true;
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { error: "Invalid credentials" });
});

app.get("/admin/dashboard", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  res.render("admin-dashboard", { properties: loadJSON(propertyFile) });
});

app.get("/admin/delete/:id", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  const props = loadJSON(propertyFile).filter((p) => p.id !== req.params.id);
  saveJSON(propertyFile, props);
  res.redirect("/admin/dashboard");
});

// Excel import (form)
app.get("/admin/import", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  res.render("admin-import", { success: null, error: null });
});

// Excel import (handler)
app.post("/admin/import", uploadExcel.single("excelFile"), (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let properties = loadJSON(propertyFile);
    let added = 0;

    rows.forEach((row) => {
      // Expected columns: Title, Type, ListingType, Price, Location, Description, Photo
      if (row.Title && row.Price && row.Location) {
        const listingType = (row.ListingType || "Sale").toString();
        const photoPath = row.Photo && String(row.Photo).trim()
          ? String(row.Photo).trim()
          : "/images/property.jpg";

        properties.push({
          id: uuidv4(),
          title: String(row.Title),
          type: row.Type ? String(row.Type) : "Apartment",
          listingType,
          price: Number(row.Price),
          location: String(row.Location),
          description: row.Description ? String(row.Description) : "",
          photos: photoPath.includes(",")
            ? photoPath.split(",").map((p) => p.trim())
            : [photoPath],
          mainPhoto: photoPath.includes(",")
            ? photoPath.split(",").map((p) => p.trim())[0]
            : photoPath,
          date: new Date().toISOString(),
        });
        added++;
      }
    });

    saveJSON(propertyFile, properties);
    fs.unlinkSync(req.file.path); // cleanup temp upload

    res.render("admin-import", {
      success: `${added} properties imported successfully.`,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.render("admin-import", {
      success: null,
      error: "Error reading Excel file. Please check format.",
    });
  }
});

// -------------------- STATIC PAGES --------------------
app.get("/about", (req, res) => res.render("about"));
app.get("/contact", (req, res) => res.render("contact", { success: false }));
app.post("/contact", (req, res) => {
  console.log("📩 Contact:", req.body);
  res.render("contact", { success: true });
});
app.get("/terms", (req, res) => res.render("terms"));
app.get("/privacy", (req, res) => res.render("privacy"));

// -------------------- 404 HANDLERS --------------------
// Property-specific not found view is rendered in routes above as "property-notfound"
// Global 404 (catch-all)
app.use((req, res) => {
  res.status(404).render("404", { url: req.originalUrl });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => console.log(`✅ Running on http://localhost:${PORT}`));
