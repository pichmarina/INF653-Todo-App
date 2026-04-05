const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");
const DatabaseProvider = require("./DatabaseProvider");
const { User, Todo } = require("./models/mongoModels");

class MongoDBProvider extends DatabaseProvider {
	constructor() {
		super();
		this.providerKey = "mongodb";
		this.providerLabel = "MongoDB Atlas";
		this.connection = null;
	}

	async connect() {
		const uri = process.env.MONGO_URI;
		if (!uri) {
			throw new Error("Missing required environment variable: MONGO_URI");
		}

		try {
			this.connection = await mongoose.connect(uri, {
				dbName: "todo_app",
			});

			await Promise.all([User.init(), Todo.init()]);
			console.log("Connected to MongoDB");
		} catch (error) {
			console.error("MongoDB connection error:", error);
			throw error;
		}
	}

	normalizeEmail(email) {
		return String(email).trim().toLowerCase();
	}

	async registerUser(email, password) {
		const normalizedEmail = this.normalizeEmail(email);
		const passwordHash = await bcryptjs.hash(password, 10);

		try {
			const user = await User.create({
				email: normalizedEmail,
				passwordHash,
			});

			return {
				_id: String(user._id),
				id: String(user._id),
				email: user.email,
			};
		} catch (error) {
			if (error && error.code === 11000) {
				throw new Error("Email already exists");
			}
			throw error;
		}
	}

	async findUserByEmail(email) {
		const normalizedEmail = this.normalizeEmail(email);
		const user = await User.findOne({ email: normalizedEmail }).lean();

		if (!user) {
			return null;
		}

		return {
			...user,
			_id: String(user._id),
			id: String(user._id),
		};
	}

	async verifyPassword(password, hash) {
		return await bcryptjs.compare(password, hash);
	}

	async getTodos(userId) {
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return [];
		}

		const todos = await Todo.find({ userId }).sort({ createdAt: -1 }).lean();

		return todos.map((todo) => ({
			...todo,
			_id: String(todo._id),
			id: String(todo._id),
			userId: String(todo.userId),
		}));
	}

	async getTodoById(todoId, userId) {
		if (
			!mongoose.Types.ObjectId.isValid(todoId) ||
			!mongoose.Types.ObjectId.isValid(userId)
		) {
			return null;
		}

		const todo = await Todo.findOne({ _id: todoId, userId }).lean();
		if (!todo) {
			return null;
		}

		return {
			...todo,
			_id: String(todo._id),
			id: String(todo._id),
			userId: String(todo.userId),
		};
	}

	async createTodo(userId, text) {
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			throw new Error("Invalid user id");
		}

		const todo = await Todo.create({
			userId,
			text: String(text).trim(),
			completed: false,
		});

		return {
			_id: String(todo._id),
			id: String(todo._id),
			userId: String(todo.userId),
			text: todo.text,
			completed: todo.completed,
			createdAt: todo.createdAt,
		};
	}

	async updateTodo(todoId, userId, updates) {
		if (
			!mongoose.Types.ObjectId.isValid(todoId) ||
			!mongoose.Types.ObjectId.isValid(userId)
		) {
			return null;
		}

		const safeUpdates = {};
		if (typeof updates.text === "string") {
			safeUpdates.text = updates.text.trim();
		}
		if (typeof updates.completed === "boolean") {
			safeUpdates.completed = updates.completed;
		}

		const todo = await Todo.findOneAndUpdate(
			{ _id: todoId, userId },
			safeUpdates,
			{ new: true }
		).lean();

		if (!todo) {
			return null;
		}

		return {
			...todo,
			_id: String(todo._id),
			id: String(todo._id),
			userId: String(todo.userId),
		};
	}

	async deleteTodo(todoId, userId) {
		if (
			!mongoose.Types.ObjectId.isValid(todoId) ||
			!mongoose.Types.ObjectId.isValid(userId)
		) {
			return false;
		}

		const deletedTodo = await Todo.findOneAndDelete({ _id: todoId, userId });
		return !!deletedTodo;
	}
}

module.exports = MongoDBProvider;