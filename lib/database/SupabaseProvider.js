const bcryptjs = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const DatabaseProvider = require("./DatabaseProvider");
const {
	SUPABASE_TABLES,
	mapUserRowToModel,
	mapTodoRowToModel,
} = require("./models/supabaseModels");

class SupabaseProvider extends DatabaseProvider {
	constructor() {
		super();
		this.providerKey = "supabase";
		this.providerLabel = "Supabase";
		this.supabase = null;
	}

	async connect() {
		const url = process.env.SUPABASE_URL;
		const key = process.env.SUPABASE_KEY;

		if (!url || !key) {
			throw new Error(
				"Missing required environment variables: SUPABASE_URL and SUPABASE_KEY"
			);
		}

		try {
			this.supabase = createClient(url, key);
			await this.initializeDatabase();
			console.log("Connected to Supabase");
		} catch (error) {
			console.error("Supabase connection error:", error);
			throw error;
		}
	}

	normalizeEmail(email) {
		return String(email).trim().toLowerCase();
	}

	async initializeDatabase() {
		const { error } = await this.supabase
			.from(SUPABASE_TABLES.USERS)
			.select("id")
			.limit(1);

		if (error) {
			throw new Error(
				`${error.message}. Make sure you created the users and todos tables in Supabase.`
			);
		}
	}

	async registerUser(email, password) {
		const normalizedEmail = this.normalizeEmail(email);

		const { data: existingUser, error: existingError } = await this.supabase
			.from(SUPABASE_TABLES.USERS)
			.select("id")
			.eq("email", normalizedEmail)
			.maybeSingle();

		if (existingError) {
			throw existingError;
		}

		if (existingUser) {
			throw new Error("Email already exists");
		}

		const passwordHash = await bcryptjs.hash(password, 10);

		const { data, error } = await this.supabase
			.from(SUPABASE_TABLES.USERS)
			.insert([{ email: normalizedEmail, password_hash: passwordHash }])
			.select("id, email, created_at")
			.single();

		if (error) {
			throw error;
		}

		return mapUserRowToModel(data);
	}

	async findUserByEmail(email) {
		const normalizedEmail = this.normalizeEmail(email);

		const { data, error } = await this.supabase
			.from(SUPABASE_TABLES.USERS)
			.select("id, email, password_hash, created_at")
			.eq("email", normalizedEmail)
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (!data) {
			return null;
		}

		return mapUserRowToModel(data);
	}

	async verifyPassword(password, hash) {
		return await bcryptjs.compare(password, hash);
	}

	async getTodos(userId) {
		const { data, error } = await this.supabase
			.from(SUPABASE_TABLES.TODOS)
			.select("*")
			.eq("user_id", userId)
			.order("created_at", { ascending: false });

		if (error) {
			throw error;
		}

		return data.map(mapTodoRowToModel);
	}

	async getTodoById(todoId, userId) {
		const { data, error } = await this.supabase
			.from(SUPABASE_TABLES.TODOS)
			.select("*")
			.eq("id", todoId)
			.eq("user_id", userId)
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (!data) {
			return null;
		}

		return mapTodoRowToModel(data);
	}

	async createTodo(userId, text) {
		const { data, error } = await this.supabase
			.from(SUPABASE_TABLES.TODOS)
			.insert([
				{
					user_id: userId,
					text: String(text).trim(),
					completed: false,
				},
			])
			.select("*")
			.single();

		if (error) {
			throw error;
		}

		return mapTodoRowToModel(data);
	}

	async updateTodo(todoId, userId, updates) {
		const safeUpdates = {};
		if (typeof updates.text === "string") {
			safeUpdates.text = updates.text.trim();
		}
		if (typeof updates.completed === "boolean") {
			safeUpdates.completed = updates.completed;
		}

		const { data, error } = await this.supabase
			.from(SUPABASE_TABLES.TODOS)
			.update(safeUpdates)
			.eq("id", todoId)
			.eq("user_id", userId)
			.select("*")
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (!data) {
			return null;
		}

		return mapTodoRowToModel(data);
	}

	async deleteTodo(todoId, userId) {
		const existingTodo = await this.getTodoById(todoId, userId);
		if (!existingTodo) {
			return false;
		}

		const { error } = await this.supabase
			.from(SUPABASE_TABLES.TODOS)
			.delete()
			.eq("id", todoId)
			.eq("user_id", userId);

		if (error) {
			throw error;
		}

		return true;
	}
}

module.exports = SupabaseProvider;