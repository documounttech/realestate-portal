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
const PORT = 3000;

const dataDir = "./data";

// ✅ Add these three lines (in this exact order)
const userFile = path.join(dataDir, "users.json");
const propertyFile = path.join(dataDir, "properties.json");
const blogFile = path.join(dataDir, "blogs.json");


// --- SETUP ---
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


const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// Excel file upload setup
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const uploadExcel = multer({ storage: excelStorage });

// --- JSON UTILITIES ---
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


app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// --- ROUTES ---

// =========== AUTH ROUTES ===========

// Show Excel upload form
app.get("/admin/import", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  res.render("admin-import", { success: null, error: null });
});

// Handle Excel upload and import
app.post("/admin/import", uploadExcel.single("excelFile"), (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let properties = loadJSON(propertyFile);
    let added = 0;

    data.forEach((row) => {
      if (row.Title && row.Price && row.Location) {
        properties.push({
          id: uuidv4(),
          title: row.Title,
          type: row.Type || "Apartment",
          price: row.Price,
          location: row.Location,
          description: row.Description || "",
          photo: row.Photo || "/images/property.jpg",
          date: new Date().toISOString(),
        });
        added++;
      }
    });

    saveJSON(propertyFile, properties);
    fs.unlinkSync(req.file.path); // remove uploaded file
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


// Registration page
app.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

// Properties for Sale
app.get("/buy", (req, res) => {
  const properties = loadJSON(propertyFile);
  const saleProps = properties.filter(p => (p.listingType || "Sale").toLowerCase() === "sale");
  res.render("listings", { title: "Properties for Sale", properties: saleProps });
});

// Properties for Rent
app.get("/rent", (req, res) => {
  const properties = loadJSON(propertyFile);
  const rentProps = properties.filter(p => (p.listingType || "").toLowerCase() === "rent");
  res.render("listings", { title: "Properties for Rent", properties: rentProps });
});

// Handle registration
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const users = loadJSON(userFile);

  if (users.find((u) => u.email === email)) {
    return res.render("register", { error: "Email already registered", success: null });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    date: new Date().toISOString(),
  };
  users.push(newUser);
  saveJSON(userFile, users);

  res.render("register", { success: "Registration successful! Please log in.", error: null });
});

// Login page
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Handle login
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

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// User dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const properties = loadJSON(propertyFile).filter(
    (p) => p.userId === req.session.user.id
  );
  res.render("dashboard", { user: req.session.user, properties });
});

// --- Restrict property adding to logged-in users ---
app.get("/add", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("add-property");
});

// Posting New property
app.post("/add", upload.single("photo"), (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const { title, type, price, location, description, listingType } = req.body;
  const photo = req.file ? "/uploads/" + req.file.filename : "/images/property.jpg";

  const properties = loadJSON(propertyFile);
  properties.push({
    id: uuidv4(),
    title,
    type,
    price,
    location,
    description,
    listingType: listingType || "Sale",   // ✅ added
    photo,
    userId: req.session.user.id,
    listingType: row.ListingType || "Sale",  // ✅ support rentals
    userName: req.session.user.name,
    date: new Date().toISOString(),
  });
  saveJSON(propertyFile, properties);

  res.redirect("/dashboard");
});

// Show edit property form
app.get("/edit/:id", (req, res) => {
  if (!req.session.user && !req.session.admin) return res.redirect("/login");

  const properties = loadJSON(propertyFile);
  const property = properties.find((p) => p.id === req.params.id);
  if (!property) return res.status(404).send("Property not found");

  // Restrict editing to property owner or admin
  if (!req.session.admin && req.session.user.id !== property.userId) {
    return res.status(403).send("Unauthorized access");
  }

  res.render("edit-property", { property, success: null, error: null });
});


// Handle property update
app.post("/edit/:id", upload.array("photos", 6), (req, res) => {
  if (!req.session.user && !req.session.admin) return res.redirect("/login");

  let properties = loadJSON(propertyFile);
  const idx = properties.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).send("Property not found");

  const property = properties[idx];
  if (!req.session.admin && req.session.user.id !== property.userId) {
    return res.status(403).send("Unauthorized access");
  }

  const { title, type, price, location, description, listingType } = req.body;

  // If new photos uploaded, replace existing
  let photos = property.photos || [];
  if (req.files && req.files.length > 0) {
    photos = req.files.map((f) => "/uploads/" + f.filename);
  }

  // Update property fields
  properties[idx] = {
    ...property,
    title,
    type,
    price,
    location,
    description,
    listingType,
    photos,
    mainPhoto: photos[0] || property.mainPhoto,
    dateModified: new Date().toISOString(),
  };

  saveJSON(propertyFile, properties);
  res.render("edit-property", {
    property: properties[idx],
    success: "Property updated successfully!",
    error: null,
  });
});



// Home (with filters)
app.get("/", (req, res) => {
  const properties = loadJSON(propertyFile);
  const blogs = loadJSON(blogFile);   // ✅ ADD THIS LINE

  const cityFilter = req.query.city || "";
  const filtered =
    cityFilter.trim() !== ""
      ? properties.filter((p) =>
        p.location.toLowerCase().includes(cityFilter.toLowerCase())
      )
      : properties;

  const uniqueCities = [...new Set(properties.map((p) => p.location))];

  res.render("index", {
    properties: filtered,
    uniqueCities,
    cityFilter,
    session: req.session,
    blogs,   // ✅ now it’s defined
  });
});

// Add Property Form
app.get("/add", (req, res) => {
  res.render("add-property");
});

// Handle Property POST (with photo)
app.post("/add", upload.array("photos", 6), (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const { title, type, price, location, description, listingType } = req.body;
  const photos = req.files.map(f => "/uploads/" + f.filename);

  const properties = loadJSON(propertyFile);
  properties.push({
    id: uuidv4(),
    title,
    type,
    price,
    location,
    description,
    listingType: listingType || "Sale",
    photos, // store all uploaded photos
    mainPhoto: photos[0] || "/images/property.jpg", // fallback
    userId: req.session.user.id,
    userName: req.session.user.name,
    date: new Date().toISOString(),
  });

  saveJSON(propertyFile, properties);
  res.redirect("/dashboard");
});

// Property Details
app.get("/property/:id", (req, res) => {
  const properties = loadJSON(propertyFile);
  const property = properties.find((p) => p.id === req.params.id);
  if (!property) return res.status(404).send("Property not found");
  res.render("property-details", { property });
});

// ========== ADMIN ==========
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

// ========== BLOGS ==========
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

// ========== STATIC PAGES ==========
app.get("/about", (req, res) => res.render("about"));
app.get("/contact", (req, res) => res.render("contact", { success: false }));
app.post("/contact", (req, res) => {
  console.log("📩 Contact:", req.body);
  res.render("contact", { success: true });
});
app.get("/terms", (req, res) => res.render("terms"));
app.get("/privacy", (req, res) => res.render("privacy"));
//Global 404 


app.use((req, res) => {
  res.status(404).render("404", { url: req.originalUrl });
});

// ========== START ==========
app.listen(PORT, () => console.log(`✅ Running on http://localhost:${PORT}`));
