const path = require("path");
const fs = require("fs");
const express = require("express");
const { engine } = require("express-handlebars");
const methodOverride = require("method-override");
const session = require("express-session");
const dotenv = require("dotenv");
const createDatabaseProvider = require("./lib/createDatabaseProvider");

// Load environment variables
const dotenvPaths = [
	path.join(__dirname, ".env"),
	path.join(__dirname, "..", ".env"),
];

for (const dotenvPath of dotenvPaths) {
	if (fs.existsSync(dotenvPath)) {
		dotenv.config({ path: dotenvPath });
		break;
	}
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-this";

let dbProvider;

// Configure Handlebars
app.engine(
	"handlebars",
	engine({
		defaultLayout: "main",
		layoutsDir: path.join(__dirname, "views/layouts"),
	})
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

app.use(
	session({
		secret: sessionSecret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000,
		},
	})
);

app.use((req, res, next) => {
	res.locals.user = req.session.user || null;
	res.locals.isLoggedIn = !!req.session.user;
	next();
});

function requireAuth(req, res, next) {
	if (!req.session.user) {
		return res.redirect("/login?message=Please%20log%20in%20first");
	}
	next();
}

// Home
app.get("/", async (req, res, next) => {
	try {
		let todos = [];

		if (req.session.user) {
			todos = await dbProvider.getTodos(req.session.user.id);
		}

		const totalTodos = todos.length;
		const completedCount = todos.filter((todo) => todo.completed).length;
		const activeCount = totalTodos - completedCount;

		const statusMessage =
			typeof req.query.status === "string" ? req.query.status : "";
		const errorMessage =
			typeof req.query.error === "string" ? req.query.error : "";

		res.render("home", {
			todos,
			hasTodos: todos.length > 0,
			statusMessage,
			errorMessage,
			activeProvider: dbProvider.providerLabel,
			totalTodos,
			completedCount,
			activeCount,
		});
	} catch (error) {
		next(error);
	}
});

// Register
app.get("/register", (req, res) => {
	const errorMessage =
		typeof req.query.error === "string" ? req.query.error : "";
	res.render("register", { errorMessage });
});

app.post("/register", async (req, res, next) => {
	try {
		const { email, password, confirmPassword } = req.body;

		if (!email || !password || !confirmPassword) {
			return res.redirect("/register?error=All%20fields%20are%20required");
		}

		if (password !== confirmPassword) {
			return res.redirect("/register?error=Passwords%20do%20not%20match");
		}

		if (password.length < 6) {
			return res.redirect(
				"/register?error=Password%20must%20be%20at%20least%206%20characters"
			);
		}

		const user = await dbProvider.registerUser(email, password);

		req.session.user = {
			id: user._id || user.id,
			email: user.email,
		};

		res.redirect("/?status=Registration%20successful");
	} catch (error) {
		const message = typeof error?.message === "string" ? error.message : "";
		if (message.includes("already exists")) {
			return res.redirect("/register?error=Email%20already%20registered");
		}
		next(error);
	}
});

// Login
app.get("/login", (req, res) => {
	const errorMessage =
		typeof req.query.error === "string" ? req.query.error : "";
	const message = typeof req.query.message === "string" ? req.query.message : "";
	res.render("login", { errorMessage, message });
});

app.post("/login", async (req, res, next) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.redirect("/login?error=Email%20and%20password%20are%20required");
		}

		const user = await dbProvider.findUserByEmail(email);
		if (!user) {
			return res.redirect("/login?error=Email%20or%20password%20incorrect");
		}

		const isValid = await dbProvider.verifyPassword(password, user.passwordHash);
		if (!isValid) {
			return res.redirect("/login?error=Email%20or%20password%20incorrect");
		}

		req.session.user = {
			id: user._id || user.id,
			email: user.email,
		};

		res.redirect("/?status=Login%20successful");
	} catch (error) {
		next(error);
	}
});

// Logout
app.post("/logout", (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.redirect("/?error=Failed%20to%20logout");
		}
		res.redirect("/?status=Logged%20out%20successfully");
	});
});

// Create todo
app.post("/todos", requireAuth, async (req, res, next) => {
	try {
		const text = String(req.body.text || "").trim();

		if (!text) {
			return res.redirect("/?error=Todo%20text%20is%20required");
		}

		await dbProvider.createTodo(req.session.user.id, text);
		res.redirect("/?status=Todo%20created%20successfully");
	} catch (error) {
		next(error);
	}
});

// Toggle todo
app.patch("/todos/:id/toggle", requireAuth, async (req, res, next) => {
	try {
		const todo = await dbProvider.getTodoById(req.params.id, req.session.user.id);

		if (!todo) {
			return res.redirect("/?error=Todo%20not%20found");
		}

		await dbProvider.updateTodo(req.params.id, req.session.user.id, {
			completed: !todo.completed,
		});

		res.redirect("/?status=Todo%20updated%20successfully");
	} catch (error) {
		next(error);
	}
});

// Edit todo
app.patch("/todos/:id/edit", requireAuth, async (req, res, next) => {
	try {
		const text = String(req.body.text || "").trim();

		if (!text) {
			return res.redirect("/?error=Updated%20todo%20text%20is%20required");
		}

		const updatedTodo = await dbProvider.updateTodo(
			req.params.id,
			req.session.user.id,
			{ text }
		);

		if (!updatedTodo) {
			return res.redirect("/?error=Todo%20not%20found");
		}

		res.redirect("/?status=Todo%20edited%20successfully");
	} catch (error) {
		next(error);
	}
});

// Delete todo
app.delete("/todos/:id", requireAuth, async (req, res, next) => {
	try {
		const deleted = await dbProvider.deleteTodo(
			req.params.id,
			req.session.user.id
		);

		if (!deleted) {
			return res.redirect("/?error=Todo%20not%20found");
		}

		res.redirect("/?status=Todo%20deleted%20successfully");
	} catch (error) {
		next(error);
	}
});

// Error handler
app.use((err, req, res, next) => {
	if (err && err.stack) {
		console.error(err.stack);
	} else if (err && err.message) {
		console.error(err.message);
	} else {
		console.error("Unhandled error:", err);
	}

	res.status(500).send("Something went wrong!");
});

async function startServer() {
	try {
		dbProvider = await createDatabaseProvider();
		console.log(`Connected to ${dbProvider.providerLabel} database provider`);

		app.listen(port, () => {
			console.log(`Todo app listening on http://localhost:${port}`);
			console.log(`Database provider: ${dbProvider.providerLabel}`);
		});
	} catch (error) {
		if (error && error.message) {
			console.error("Failed to initialize database provider:", error.message);
		} else {
			console.error("Failed to initialize database provider:", error);
		}
		process.exit(1);
	}
}

startServer();