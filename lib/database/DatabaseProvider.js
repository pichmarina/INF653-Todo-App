class DatabaseProvider {
	constructor() {
		this.providerKey = null;
		this.providerLabel = null;
	}

	async connect() {
		throw new Error("connect must be implemented");
	}

	async registerUser(email, password) {
		throw new Error("registerUser must be implemented");
	}

	async findUserByEmail(email) {
		throw new Error("findUserByEmail must be implemented");
	}

	async verifyPassword(password, hash) {
		throw new Error("verifyPassword must be implemented");
	}

	async getTodos(userId) {
		throw new Error("getTodos must be implemented");
	}

	async getTodoById(todoId, userId) {
		throw new Error("getTodoById must be implemented");
	}

	async createTodo(userId, text) {
		throw new Error("createTodo must be implemented");
	}

	async updateTodo(todoId, userId, updates) {
		throw new Error("updateTodo must be implemented");
	}

	async deleteTodo(todoId, userId) {
		throw new Error("deleteTodo must be implemented");
	}
}

module.exports = DatabaseProvider;